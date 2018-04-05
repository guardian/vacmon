const AWS = require('aws-sdk');

const EnvironmentConfig = require('./EnvironmentConfig');

class FileConfig {
    static read() {
        const s3 = new AWS.S3();

        const params = {
          Bucket: EnvironmentConfig.bucket,
          Key: `vacmon/${EnvironmentConfig.stage}.json`
        };

        return s3.getObject(params).promise().then(data => {
            const fileContent = data.Body.toString('utf8');
            const config = JSON.parse(fileContent);
            return config;
        });
    }
}

module.exports = FileConfig;
