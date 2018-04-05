const EnvironmentConfig = require('./EnvironmentConfig');
const FileConfig = require('./FileConfig');
const ELKKinesisLogger = require('@guardian/elk-kinesis-logger');
const {Client} = require('pg');

async function getLogger(config) {
    const l = new ELKKinesisLogger({
      stage:      EnvironmentConfig.stage,
      stack:      EnvironmentConfig.stack,
      app:        EnvironmentConfig.app,
      streamName: config.logger.streamName
    });

    if (config.logger.roleArn) {
        l.withRole(config.logger.roleArn);
    }

    return await l.open();
}

async function closeLogger(logger) {
    if (!EnvironmentConfig.isDev) {
        await logger.close();
    } else {
        return Promise.resolve();
    }
}

async function getPostgresClient(config) {
    const client = new Client({
        user:     config.pg.user,
        host:     config.pg.host,
        password: config.pg.password,
        port:     config.pg.port,
        database: config.pg.database,
    });
    await client.connect();
    return client;
}

async function pollActivity() {
    const config = await FileConfig.read();

    const logger = await getLogger(config);
    const client = await getPostgresClient(config);

    const settings = await client.query(
        "SELECT name, setting " +
        "FROM pg_settings " +
        "WHERE name = 'autovacuum_vacuum_threshold' OR name = 'autovacuum_vacuum_scale_factor';"
    );

    const vacuumThreshold = parseInt(settings.rows.find(r => r.name === 'autovacuum_vacuum_threshold').setting) || 50;
    const vacuumScaleFactor = parseInt(settings.rows.find(r => r.name === 'autovacuum_vacuum_scale_factor').setting) || 0.2;

    const tupleStats = await client.query(
        "SELECT relname, n_live_tup, n_dead_tup " +
        "FROM pg_stat_user_tables " +
        "WHERE relname IN ('draftcontent', 'livecontent')");

    tupleStats.rows.forEach(r => {
        const table = r.relname;
        const deadRows = parseInt(r.n_dead_tup);
        const liveRows = parseInt(r.n_live_tup);
        const threshold = Math.round(vacuumThreshold + liveRows * vacuumScaleFactor);
        logger.log('postgres vacuum monitor', {
            table,
            deadRows,
            liveRows,
            threshold,
            totalThreshold: threshold + liveRows
        });
    });

    closeLogger(logger);
    await client.end();
}

exports.main = function() {
    pollActivity().then().catch(e => console.error('Failed to poll activity', e));
};
