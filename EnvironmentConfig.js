class EnvironmentConfig {
  static get stack() {
    return process.env.STACK || 'flexible';
  }

  static get stage() {
    return process.env.STAGE || 'CODE';
  }

  static get app() {
    return process.env.APP || 'vacmon';
  }

  static get isDev() {
    return this.stage === 'DEV';
  }

  static get bucket() {
    return process.env.CONFIG_BUCKET || 'guconf-flexible';
  }

  static get region() {
    return process.env.REGION || 'eu-west-1';
  }

  static get profile() {
    return process.env.PROFILE || 'composer';
  }
}

module.exports = EnvironmentConfig;
