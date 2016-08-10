var path = require('path');
var Blueprint = require('ember-cli/lib/models/blueprint');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');
var addBarrelRegistration = require('../../utilities/barrel-management');
var getFiles = Blueprint.prototype.files;
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');

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
  
  files: function() {
    var fileList = getFiles.call(this);
    
    if (this.options && this.options.flat) {
      fileList = fileList.filter(p => p.indexOf('index.ts') <= 0);
    }

    return fileList;
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
  },
  
  afterInstall: function(options) {
    if (options.dryRun) {
      return;
    }

    const returns = [];
    const modulePath = path.join(this.project.root, this.dynamicPath.appRoot, 'app.module.ts');
    const className = stringUtils.classify(`${options.entity.name}Pipe`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.pipe`);
    const componentDir = path.relative(this.dynamicPath.appRoot, this.generatePath);
    const importPath = componentDir ? `./${componentDir}/${fileName}` : `./${fileName}`;

    if (!options.flat) {
      returns.push(addBarrelRegistration(this, componentDir));
    } else {
      returns.push(addBarrelRegistration(this, componentDir, fileName));
    }

    if (!options['skip-import']) {
      returns.push(
        astUtils.addComponentToModule(modulePath, className, importPath)
          .then(change => change.apply()));
    }

    return Promise.all(returns);
  }
};
