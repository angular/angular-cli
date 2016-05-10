const stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: '',

  availableOptions: [
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'mobile', type: Boolean, default: false }
  ],

  locals: function (options) {
    const fullAppName = stringUtils.dasherize(options.entity.name)
      .replace(/-(.)/g, (_, l) => ' ' + l.toUpperCase())
      .replace(/^./, (l) => l.toUpperCase());

    return {
      jsComponentName: stringUtils.classify(options.entity.name),
      fullAppName: fullAppName,
      sourceDir: options.sourceDir
    };
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __path__: () => {
        return options.locals.sourceDir;
      }
    };
  }
};
