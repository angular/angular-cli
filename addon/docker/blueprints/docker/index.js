'use strict';

const stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: '',

  availableOptions: [
    { name: 'environment', type: String, aliases: ['env'] },
    { name: 'service-name', type: String, default: 'ngapp', aliases: ['s'] },
    { name: 'service-port', type: Number, default: 8000, aliases: ['sp'] },
    { name: 'container-port', type: Number, default: 80, aliases: ['cp'] },
    { name: 'use-image', type: Boolean, default: false, aliases: ['i'] },
    { name: 'registry', type: String, aliases: ['r'] },
    { name: 'image-org', type: String, aliases: ['o'] },
    { name: 'image-name', type: String, aliases: ['in'] }
  ],

  locals: function (options) {
    return {
      environment: options.environment,
      serviceName: options.serviceName,
      servicePort: options.servicePort,
      containerPort: options.containerPort,
      useImage: options.useImage,
      registry: options.registry,
      imageOrg: options.imageOrg,
      imageName: options.imageName
    };
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __environment__: () => {
        return (options.locals.environment) ?
          '-' + stringUtils.dasherize(options.locals.environment) : '';
      }
    };
  }
};
