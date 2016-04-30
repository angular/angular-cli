var path = require('path');
var chalk = require('chalk');
var Blueprint = require('ember-cli/lib/models/blueprint');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');
var addBarrelRegistration = require('../../utilities/barrel-management');
var getFiles = Blueprint.prototype.files;
const stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: false },
    { name: 'route', type: Boolean, default: false },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'prefix', type: Boolean, default: true }
  ],

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;

    var defaultPrefix = '';
    if (this.project.ngConfig &&
        this.project.ngConfig.defaults &&
        this.project.ngConfig.defaults.prefix) {
      defaultPrefix = this.project.ngConfig.defaults.prefix + '-';
    }
    var prefix = this.options.prefix ? defaultPrefix : '';
    this.selector = stringUtils.dasherize(prefix + parsedPath.name);

    if (this.selector.indexOf('-') === -1) {
      this._writeStatusToUI(chalk.yellow, 'WARNING', 'selectors should contain a dash');
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
      isAppComponent: !!options.isAppComponent,
      selector: this.selector
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
        var srcDir = this.project.ngConfig.defaults.sourceDir;
        this.appDir = dir.substr(dir.indexOf(srcDir) + srcDir.length);
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
      var filePath = path.join(this.project.ngConfig.defaults.sourceDir, 'system-config.ts');
      var barrelUrl = this.appDir.replace(/\\/g, '/');
      if (barrelUrl[0] === '/') {
        barrelUrl = barrelUrl.substr(1);
      }

      return addBarrelRegistration(this, this.generatePath)
        .then(() => {
          return this.insertIntoFile(
            filePath,
            `  '${barrelUrl}',`,
            { before: '  /** @cli-barrel */' }
          );
        });
    } else {
      return addBarrelRegistration(
        this,
        this.generatePath,
        options.entity.name + '.component');
    }
  }
};
