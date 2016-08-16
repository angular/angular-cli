var path = require('path');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');

module.exports = {
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: true }
  ],

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options) {
    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat
    };
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __path__: () => {
        var dir = this.dynamicPath.dir;
        if (!options.locals.flat) {
          dir += path.sep + options.dasherizedModuleName;
        }
        this.generatePath = dir;
        return dir;
      }
    };
  }
};
