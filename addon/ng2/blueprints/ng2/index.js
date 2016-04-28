const path        = require('path');
const stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: '',

  locals: function(options) {
    //TODO: pull value from config
    this.styleExt = 'css';
    this.version = require(path.resolve(__dirname, '..', '..', '..', '..', 'package.json')).version;
    
    return {
      htmlComponentName: stringUtils.dasherize(options.entity.name),
      jsComponentName: stringUtils.classify(options.entity.name),
      styleExt: this.styleExt,
      version: this.version
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
