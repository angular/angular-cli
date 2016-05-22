'use strict';

const Command = require('ember-cli/lib/models/command');
const ValidateDockerCli = require('../tasks/validate-docker-cli');
const BuildTask = require('ember-cli/lib/tasks/build');
const Promise = require('ember-cli/lib/ext/promise');

module.exports = Command.extend({
  name: 'docker:push',
  description: 'Builds and pushes a Docker image to a registry.',
  aliases: ['d:p'],
  works: 'insideProject',

  availableOptions: [
     { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
     { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
     { name: 'tag-latest', type: Boolean, default: false, aliases: ['tl', 'latest'] },
     { name: 'environment', type: Boolean, default: 'default', aliases: ['e', 'env'] },
     { name: 'skip-build', type: Boolean, default: false },
     { name: 'config-env', type: String, default: 'prod' },
     { name: 'no-cache', type: Boolean, default: false },
     { name: 'force-rm', type: Boolean, default: false },
     { name: 'pull', type: Boolean, default: false }
  ],

  anonymousOptions: ['<tag>'],

  run: function(commandOptions, rawArgs) {
    var tag = (rawArgs.length) ? rawArgs[0] : null;

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
      .then(() => buildImage(commandOptions.environment))
      .then(() => tagImage(tag))
      .then(() => pushImage(tag))
      .then(buildAndTagLatest);

    function buildApp() {
      if (commandOptions.skipBuild) return Promise.resolve();
      return buildTask.run(buildOptions);
    }

    function buildAndTagLatest() {
      if (!commandOptions.tagLatest) return Promise.resolve();
      return tagImage('latest')
        .then(() => pushImage('latest'));
    }

    // TODO: Move to a task
    function buildImage(environment) {
      // TODO: validate docker build env
      // TODO: docker-compose build {serviceName}
      return Promise.resolve(environment);
    }

    // TODO: Move to a task
    function tagImage(tag) {
      // TODO: docker tag
      return Promise.resolve(tag);
    }

    // TODO: Move to a task
    function pushImage(tag) {
      // TODO: docker push
      // TODO: docker login \ aws ecr get-login
      return Promise.resolve(tag);
    }
  }
});
