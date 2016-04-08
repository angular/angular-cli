var stringUtils = require('ember-cli/lib/utilities/string');

module.exports = {
  description: '',

  locals: function(options) {
    //TODO: pull value from config
    this.styleExt = 'css';
    
    return {
      htmlComponentName: stringUtils.dasherize(options.entity.name),
      jsComponentName: stringUtils.classify(options.entity.name),
      styleExt: this.styleExt
    };
  },
  
  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __styleext__: () => {
        return options.locals.styleExt;
      }
    };
  }
};
