'use strict';

const Command = require('ember-cli/lib/models/command');
const normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');
const ValidateDockerCli = require('../tasks/validate-docker-cli');
const SetDockerConfig = require('../tasks/set-docker-config');

module.exports = Command.extend({
  name: 'docker:init',
  description: 'Initializes settings and files for building and deploying to a Docker environment.',
  aliases: ['d:i'],
  works: 'insideProject',

  availableOptions: [
    { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
    { name: 'blueprint', type: String, aliases: ['b'] },
    {
      name: 'machine', type: String, aliases: ['m'], default: 'native',
      description: 'The Docker Machine name of the deploy machine for this environment.'
    },
    {
      name: 'service-name', type: String, default: 'ngapp', aliases: ['s', 'service'],
      description: 'The service name of the Angular app for use in the compose file.'
    },
    {
      name: 'service-port', type: Number, default: 8000, aliases: ['sp'],
      description: 'The external port of the Angular service exposed on the host machine.'
    },
    {
      name: 'container-port', type: Number, default: 80, aliases: ['cp'],
      description: 'The internal port of the Angular service within the container.'
    },
    {
      name: 'use-image', type: Boolean, default: false, aliases: ['ui'],
      description: 'Use an image URI when deploying, instead of building.' +
        ' Requires the image pushed to an external registry.'
    },
    {
      name: 'registry', type: String, aliases: ['r', 'reg'],
      description: 'The default Docker registry address to use for the "docker:push" command.'
    },
    {
      name: 'image-org', type: String, aliases: ['o', 'org'],
      description: 'The organization name for the image when pushing to a Docker registry.'
    },
    {
      name: 'image-name', type: String, aliases: ['im', 'image'],
      description: 'The image name to use when building or pulling from a Docker registry.'
    }
  ],

  anonymousOptions: ['<environment>'],

  _defaultBlueprint: function () {
    return (this.project.isEmberCLIAddon()) ? 'addon' : 'docker';
  },

  run: function(commandOptions, rawArgs) {
    var environment = (rawArgs.length) ? rawArgs[0] : null;
    var imageName = commandOptions.imageName || commandOptions.serviceName;

    // Validate Docker CLI options
    var validateDockerCli = new ValidateDockerCli({
      ui: this.ui,
      project: this.project
    });
    var validateDockerOpts = {
      verbose: commandOptions.verbose
    };

    // Set Docker configuration options
    var setDockerConfig = new SetDockerConfig({
      ui: this.ui,
      project: this.project
    });

    var configOpts = {
      dryRun: commandOptions.dryRun
    };

    var dockerProjectCfg = {
      imageName: imageName,
      imageOrg: commandOptions.imageOrg,
      registry: commandOptions.registry
    };
    var dockerEnvCfg = {
      name: environment || 'default',
      useImage: commandOptions.useImage,
      serviceName: commandOptions.serviceName,
      machine: commandOptions.machine
    };

    // Install Docker blueprints options
    var installBlueprint = new this.tasks.InstallBlueprint({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    var blueprintOpts = {
      dryRun: commandOptions.dryRun,
      blueprint: commandOptions.blueprint || this._defaultBlueprint(),
      rawName: this.project.root,
      targetFiles: '',
      rawArgs: rawArgs.toString(),
      environment: environment,
      machine: commandOptions.machine,
      serviceName: commandOptions.serviceName,
      servicePort: commandOptions.servicePort,
      containerPort: commandOptions.containerPort,
      useImage: commandOptions.useImage,
      registry: commandOptions.registry,
      imageOrg: commandOptions.imageOrg,
      imageName: imageName
    };

    blueprintOpts.blueprint = normalizeBlueprint(blueprintOpts.blueprint);

    return validateDockerCli.run(validateDockerOpts)
      .then(() => setDockerConfig.run(dockerProjectCfg, dockerEnvCfg, configOpts))
      .then(() => installBlueprint.run(blueprintOpts));
  }
});
