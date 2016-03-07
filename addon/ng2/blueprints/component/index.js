var stringUtils = require('ember-cli/lib/utilities/string');
var path = require('path');

module.exports = {
  description: '',

  locals: function(options) {
    var parsedPath = path.parse(options.entity.name);
    // build the locals for generating the name & path
    return {
      name: parsedPath.name,
      path: parsedPath.dir
    };
  },

  fileMapTokens: function(options) {
    // Return custom template variables here.
    return {
      __name__: function(options) {
        return options.locals.name;
      },
      __path__: function(options) {
        return options.locals.path || 'components';
      }
    };
  }
};
