var dynamicPathParser = require('../../utilities/dynamic-path-parser');

module.exports = {
  description: '',

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  fileMapTokens: function () {
    // Return custom template variables here.
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir;
        return this.generatePath;
      }
    };
  }
};
