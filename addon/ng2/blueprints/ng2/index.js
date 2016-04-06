var stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: '',

  locals: function(options) {
    return {
      htmlComponentName: stringUtils.dasherize(options.entity.name),
      jsComponentName: stringUtils.classify(options.entity.name)
    };
  }
};
