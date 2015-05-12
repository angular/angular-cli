var stringUtils = require('ember-cli/lib/utilities/string');

module.exports = {
  description: '',

  locals: function(options) {
     // Return custom template variables here.
     return {
       htmlComponentName: stringUtils.dasherize(options.entity.name),
       jsComponentName: stringUtils.classify(options.entity.name)
     };
  }

  // afterInstall: function(options) {
  //   // Perform extra work here.
  // }
};
