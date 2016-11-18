const stringUtils = require('ember-cli-string-utils');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const Blueprint = require('../../ember-cli/lib/models/blueprint');
const getFiles = Blueprint.prototype.files;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'spec', type: Boolean }
  ],

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName.split('.')[0]);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options) {
    const rawName = options.args[1];
    const nameParts = rawName.split('.')
      .filter(part => part.length !== 0);

    const classType = nameParts[1];
    this.fileName = stringUtils.dasherize(options.entity.name);
    if (classType) {
      this.fileName += '.' + classType.toLowerCase();
    }

    options.spec = options.spec !== undefined ?
      options.spec :
      this.project.ngConfigObj.get('defaults.spec.class');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      fileName: this.fileName
    };
  },

  files: function() {
    var fileList = getFiles.call(this);

    if (this.options && !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.spec.ts') < 0);
    }

    return fileList;
  },

  fileMapTokens: function () {
    // Return custom template variables here.
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir;
        return this.generatePath;
      },
      __name__: () => {
        return this.fileName;
      }
    };
  }
};
