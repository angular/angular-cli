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
    {
      name: 'tag-latest', type: Boolean, default: false, aliases: ['tl', 'latest'],
      description: 'Additionally apply the "latest" tag to the image.'
    },
    {
      name: 'machine', type: String, aliases: ['m'],
      description: 'The Docker Machine name to use as the build machine.' +
        ' Defaults to the local native or "default" docker machine.'
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
    }
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
      .then(() => buildImage(commandOptions.machine))
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
    function buildImage(machine) {
      // TODO: validate docker build env
      // TODO: docker-compose build {serviceName}
      return Promise.resolve(machine);
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
