'use strict';

const Promise = require('ember-cli/lib/ext/promise');
const Task = require('ember-cli/lib/models/task');
const CliConfig = require('../../ng2/models/config').CliConfig;

module.exports = Task.extend({
  run: function (projectCfg, envCfg, options) {
    options = options || {};

    return new Promise((resolve) => {
      const ngConfig = new CliConfig();
      var dockerCfg = getDockerConfig(ngConfig);

      setDockerProjectConfig(dockerCfg, projectCfg);
      setDockerEnvironmentConfig(dockerCfg, envCfg);

      if (!options.dryRun) {
        ngConfig.save();
      }

      resolve();
    });
  }
});

/**
 * Finds an existing docker addon configuration, or creates
 * a default config structure if one does not exist.
 */
function getDockerConfig(ngConfig) {
  var dockerCfg;
  var addonsCfg = ngConfig.get('addons').filter((addon) => {
    return addon.name === 'docker';
  });

  if (addonsCfg.length) {
    dockerCfg = addonsCfg[0];
  } else {
    dockerCfg = {};
    ngConfig.set('addons.push', dockerCfg);
  }

  dockerCfg.name = 'docker';
  dockerCfg.description = 'Docker build and deployment settings.';
  dockerCfg.defaults = dockerCfg.defaults || {};
  dockerCfg.project = dockerCfg.project || {};
  dockerCfg.project.environments = dockerCfg.project.environments || [];

  return dockerCfg;
}

/**
 * Applies new docker project settings to the docker config.
 */
function setDockerProjectConfig(dockerCfg, projectCfg) {
  if (!projectCfg) {
    return;
  }

  var projProps = ['imageName', 'imageOrg', 'registry'];
  projProps.forEach((prop) => {
    if (prop in projectCfg) {
      dockerCfg.project[prop] = projectCfg[prop];
    }
  });
}

/**
 * Finds a docker environment config set by name (if existing) and sets new values.
 */
function setDockerEnvironmentConfig(dockerCfg, envCfg) {
  if (!envCfg || !envCfg.name) {
    return;
  }

  var envProps = ['name', 'useImage', 'machine', 'serviceName'];
  var environmentsCfg = dockerCfg.project.environments.filter((item) => {
    return item.name === envCfg.name;
  });
  var dockerCfgEnv;

  if (environmentsCfg.length) {
    dockerCfgEnv = environmentsCfg[0];
  } else {
    dockerCfgEnv = {};
    dockerCfg.project.environments.push(dockerCfgEnv);
  }

  envProps.forEach((prop) => {
    if (prop in envCfg) {
      dockerCfgEnv[prop] = envCfg[prop];
    }
  });
}
