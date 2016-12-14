const path = require('path');
const Blueprint   = require('../../ember-cli/lib/models/blueprint');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const getFiles = Blueprint.prototype.files;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'spec', type: Boolean },
    { name: 'routing', type: Boolean, default: false }
  ],

  normalizeEntityName: function (entityName) {
    this.entityName = entityName;
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options) {
    options.spec = options.spec !== undefined ?
      options.spec :
      this.project.ngConfigObj.get('defaults.spec.module');

    return {
      dynamicPath: this.dynamicPath.dir,
      spec: options.spec,
      routing: options.routing
    };
  },

  files: function() {
    var fileList = getFiles.call(this);

    if (!this.options || !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.module.spec.ts') < 0);
    }
    if (this.options && !this.options.routing) {
      fileList = fileList.filter(p => p.indexOf('__name__-routing.module.ts') < 0);
    }

    return fileList;
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    this.dasherizedModuleName = options.dasherizedModuleName;
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir
          + path.sep
          + options.dasherizedModuleName;
        return this.generatePath;
      }
    };
  },

  afterInstall: function (options) {
    // Note that `this.generatePath` already contains `this.dasherizedModuleName`
    // So, the path will end like `name/name`,
    //  which is correct for `name.component.ts` created in module `name`
    if (this.options && this.options.routing) {
      var componentPath = path.join(this.generatePath, this.dasherizedModuleName);
      options.entity.name = path.relative(this.dynamicPath.appRoot, componentPath);
      options.flat = true;
      options.route = false;
      options.inlineTemplate = false;
      options.inlineStyle = false;
      options.prefix = null;
      options.spec = true;
      return Blueprint.load(path.join(__dirname, '../component')).install(options);
    }
  }
};
