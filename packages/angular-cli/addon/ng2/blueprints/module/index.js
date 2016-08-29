var dynamicPathParser = require('../../utilities/dynamic-path-parser');
var Blueprint = require('ember-cli/lib/models/blueprint');
var getFiles = Blueprint.prototype.files;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'spec', type: Boolean, default: false }
  ],
  
  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options) {
    return { 
      dynamicPath: this.dynamicPath.dir,
      spec: options.spec
    };
  },

  files: function() {
    var fileList = getFiles.call(this);

    if (!this.options || !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.module.spec.ts') < 0);
    }

    return fileList;
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
