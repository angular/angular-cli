'use strict';

const Command = require('ember-cli/lib/models/command');
const ValidateDockerCli = require('../tasks/validate-docker-cli');
const BuildTask = require('ember-cli/lib/tasks/build');
const Promise = require('ember-cli/lib/ext/promise');

module.exports = Command.extend({
  name: 'docker:deploy',
  description: 'Builds and deploys to a Docker environment.',
  aliases: ['d:d'],
  works: 'insideProject',

  availableOptions: [
     { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
     { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
     { name: 'tag', type: String, aliases: ['t'] },
     { name: 'services', type: Array, aliases: ['s'] },
     { name: 'skip-build', type: Boolean, default: false },
     { name: 'config-env', type: String, default: 'prod' },
     { name: 'no-cache', type: Boolean, default: false },
     { name: 'force-rm', type: Boolean, default: false },
     { name: 'pull', type: Boolean, default: false },
     { name: 'force-recreate', type: Boolean, default: false },
     { name: 'no-recreate', type: Boolean, default: false }
  ],

  anonymousOptions: ['<environment>'],

  run: function(commandOptions, rawArgs) {
    var environment = (rawArgs.length) ? rawArgs[0] : null;

    // Validate Docker CLI options
    var validateDockerCli = new ValidateDockerCli({
      ui: this.ui,
      project: this.project
    });
    var validateDockerOpts = {
      verbose: commandOptions.verbose
    };

    // Build task options
    var buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    var buildOptions = {
      environment: commandOptions.configEnv,
      outputPath: 'dist/'
    };

    return validateDockerCli.run(validateDockerOpts)
      .then(buildApp)
      .then(buildImage)
      .then(deploy);

    function buildApp() {
      // TODO: If environment useImage == true, skip the build.
      if (commandOptions.skipBuild) return Promise.resolve();
      return buildTask.run(buildOptions);
    }

    function buildImage() {
      // TODO: If environment useImage == true, skip the build.
      // TODO: Use a reusable task for image builds
      // TODO: Validate docker build env
      // TODO: docker-compose build {serviceName}
      return Promise.resolve();
    }

    // TODO: Move to a task
    function deploy() {
      // TODO: Validate docker deploy env
      // TODO: docker-compose up -d [services]
      return Promise.resolve();
    }
  }
});
