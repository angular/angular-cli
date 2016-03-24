var dynamicPathParser = require('../../utilities/dynamic-path-parser');

module.exports = {
  description: '',

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function () {
    return {
      dynamicPath: this.dynamicPath.dir
    };
  },

  fileMapTokens: function () {
    // Return custom template variables here.
    return {
      __name__: () => {
        return this.dynamicPath.name;
      },
      __path__: () => {
        return this.dynamicPath.dir;
      }
    };
  }
};
