var path = require('path');
var chalk = require('chalk');
var Blueprint = require('ember-cli/lib/models/blueprint');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');
var getFiles = Blueprint.prototype.files;
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');

module.exports = {
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: false },
    { name: 'route', type: Boolean, default: false },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'prefix', type: Boolean, default: true },
    { name: 'spec', type: Boolean, default: true }
  ],

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;

    var defaultPrefix = '';
    if (this.project.ngConfig &&
        this.project.ngConfig.apps[0] &&
        this.project.ngConfig.apps[0].prefix) {
      defaultPrefix = this.project.ngConfig.apps[0].prefix + '-';
    }
    var prefix = this.options.prefix ? defaultPrefix : '';
    this.selector = stringUtils.dasherize(prefix + parsedPath.name);

    if (this.selector.indexOf('-') === -1) {
      this._writeStatusToUI(chalk.yellow, 'WARNING', 'selectors should contain a dash');
    }

    return parsedPath.name;
  },

  locals: function (options) {
    this.styleExt = 'css';
    if (this.project.ngConfig &&
        this.project.ngConfig.defaults &&
        this.project.ngConfig.defaults.styleExt) {
      this.styleExt = this.project.ngConfig.defaults.styleExt;
    }

    return {
      dynamicPath: this.dynamicPath.dir.replace(this.dynamicPath.appRoot, ''),
      flat: options.flat,
      spec: options.spec,
      inlineTemplate: options.inlineTemplate,
      inlineStyle: options.inlineStyle,
      route: options.route,
      isLazyRoute: !!options.isLazyRoute,
      isAppComponent: !!options.isAppComponent,
      selector: this.selector,
      styleExt: this.styleExt
    };
  },

  files: function() {
    var fileList = getFiles.call(this);

    if (this.options && this.options.inlineTemplate) {
      fileList = fileList.filter(p => p.indexOf('.html') < 0);
    }
    if (this.options && this.options.inlineStyle) {
      fileList = fileList.filter(p => p.indexOf('.__styleext__') < 0);
    }
    if (this.options && !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.component.spec.ts') < 0);
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
            var lazyRoutePrefix = '+';
            if (this.project.ngConfig &&
                this.project.ngConfig.defaults &&
                this.project.ngConfig.defaults.lazyRoutePrefix !== undefined) {
              lazyRoutePrefix = this.project.ngConfig.defaults.lazyRoutePrefix;
            }
            var dirParts = dir.split(path.sep);
            dirParts[dirParts.length - 1] = `${lazyRoutePrefix}${dirParts[dirParts.length - 1]}`;
            dir = dirParts.join(path.sep);
          }
        }
        var srcDir = this.project.ngConfig.apps[0].root;
        this.appDir = dir.substr(dir.indexOf(srcDir) + srcDir.length);
        this.generatePath = dir;
        return dir;
      },
      __styleext__: () => {
        return this.styleExt;
      }
    };
  },

  afterInstall: function(options) {
    if (options.dryRun) {
      return;
    }

    const returns = [];
    const modulePath = path.join(this.project.root, this.dynamicPath.appRoot, 'app.module.ts');
    const className = stringUtils.classify(`${options.entity.name}Component`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.component`);
    const componentDir = path.relative(this.dynamicPath.appRoot, this.generatePath);
    const importPath = componentDir ? `./${componentDir}/${fileName}` : `./${fileName}`;

    if (!options['skip-import']) {
      returns.push(
        astUtils.addComponentToModule(modulePath, className, importPath)
          .then(change => change.apply()));
    }

    return Promise.all(returns);
  }
};
