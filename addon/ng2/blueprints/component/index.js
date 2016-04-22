var path = require('path');
var Blueprint = require('ember-cli/lib/models/blueprint');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');
var addBarrelRegistration = require('../../utilities/barrel-management');
var getFiles = Blueprint.prototype.files;

function validateName(name) {
  if (name.indexOf('-') >= 0) {
    return true;
  } else if (name === name.toUpperCase()) {
    return false;
  } else if (name === name.toLowerCase()) {
    return false;
  }
  return true;
}

module.exports = {
  description: '',
  
  availableOptions: [
    { name: 'flat', type: Boolean, default: false },
    { name: 'route', type: Boolean, default: false },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] }
  ],

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    
    if (!validateName(parsedPath.name)) {
      throw 'Names must contain a dash either include a dash or multiCase name. (i.e. multiCase -> multi-case)';
    }
    
    return parsedPath.name;
  },

  locals: function (options) {
    //TODO: pull value from config
    this.styleExt = 'css';
    
    return {
      dynamicPath: this.dynamicPath.dir.replace(this.dynamicPath.appRoot, ''),
      flat: options.flat,
      inlineTemplate: options.inlineTemplate,
      inlineStyle: options.inlineStyle,
      route: options.route,
      styleExt: this.styleExt,
      isLazyRoute: !!options.isLazyRoute,
      isAppComponent: !!options.isAppComponent
    };
  },
  
  files: function() {
    var fileList = getFiles.call(this);
    
    if (this.options && this.options.flat) {
      fileList = fileList.filter(p => p.indexOf('index.ts') <= 0);
    }
    if (this.options && !this.options.route) {
      fileList = fileList.filter(p => p.indexOf(path.join('shared', 'index.ts')) <= 0);
    }
    if (this.options && this.options.inlineTemplate) {
      fileList = fileList.filter(p => p.indexOf('.html') < 0);
    }
    if (this.options && this.options.inlineStyle) {
      fileList = fileList.filter(p => p.indexOf('.__styleext__') < 0);
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
          
          if (options.locals.isLazyRoute) {
            var dirParts = dir.split(path.sep);
            dirParts[dirParts.length - 1] = `+${dirParts[dirParts.length - 1]}`;
            dir = dirParts.join(path.sep);
          }
        }
        this.appDir = dir.replace(`src${path.sep}client${path.sep}`, '');
        this.generatePath = dir;
        return dir;
      },
      __styleext__: () => {
        return options.locals.styleExt;
      }
    };
  },
  
  afterInstall: function(options) {
    if (!options.flat) {
      var filePath = path.join('src', 'client', 'system-config.ts');
      var barrelUrl = this.appDir.replace(path.sep, '/');
      
      return addBarrelRegistration(this, this.generatePath)
        .then(() => {
          return this.insertIntoFile(
            filePath,
            `  '${barrelUrl}',`,
            { before: '  /** @cli-barrel */' }
          );
        })
    } else {
      return addBarrelRegistration(
        this, 
        this.generatePath,
        options.entity.name + '.component');
    }
  }
};
