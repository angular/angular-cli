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
    {
      name: 'tag', type: String, aliases: ['t'],
      description: 'The Docker tag to use for deploying images.'
    },
    {
      name: 'machine', type: String, aliases: ['m'],
      description: 'The Docker Machine name to use as the deploy destination.'
    },
    {
      name: 'services', type: Array, aliases: ['s'],
      description: 'The specific service name(s) to deploy from the compose file.'
    },
    {
      name: 'config-env', type: String, default: 'prod', aliases: ['ce', 'cfg'],
      description: 'The Angular configuration environment file to include in the build.'
    },
    {
      name: 'skip-build', type: Boolean, default: false, aliases: ['sb'],
      description: 'Do not build the Angular application. Use current contents of "dist/".'
    },
    {
      name: 'no-cache', type: Boolean, default: false, aliases: ['nc'],
      description: 'Do not use cache when building the image.'
    },
    {
      name: 'force-rm', type: Boolean, default: false, aliases: ['rm'],
      description: 'Always remove intermediate containers.'
    },
    {
      name: 'pull', type: Boolean, default: false,
      description: 'Always attempt to pull a newer version of the image.'
    },
    {
      name: 'force-recreate', type: Boolean, default: false, aliases: ['fr'],
      description: 'Recreate containers even if their configuration and image haven\'t changed.'
    },
    {
      name: 'no-recreate', type: Boolean, default: false, aliases: ['nr'],
      description: 'If containers already exist, don\'t recreate them.'
    }
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
