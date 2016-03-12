var stringUtils = require('ember-cli/lib/utilities/string');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');

module.exports = {
  description: '',

  normalizeEntityName: function(entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);
    
    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function(options) {
    return {
      dynamicPath: this.dynamicPath.dir
    };
  },

  fileMapTokens: function(options) {
    // Return custom template variables here.
    return {
      __name__: (options) => {
        return this.dynamicPath.name;
      },
      __path__: (options) => {
        return this.dynamicPath.dir;
      }
    };
  }
};
