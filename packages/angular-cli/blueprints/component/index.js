const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Blueprint = require('../../ember-cli/lib/models/blueprint');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const findParentModule = require('../../utilities/find-parent-module').default;
const getFiles = Blueprint.prototype.files;
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');
const NodeHost = require('@angular-cli/ast-tools').NodeHost;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: false },
    { name: 'inline-template', type: Boolean, aliases: ['it'] },
    { name: 'inline-style', type: Boolean, aliases: ['is'] },
    { name: 'prefix', type: String, default: null },
    { name: 'spec', type: Boolean },
    { name: 'view-encapsulation', type: String, aliases: ['ve'] },
    { name: 'change-detection', type: String, aliases: ['cd'] },
    { name: 'skip-import', type: Boolean, default: false },
    { name: 'module', type: String, aliases: ['m'] }
  ],

  beforeInstall: function(options) {
    if (options.module) {
      // Resolve path to module
      const modulePath = options.module.endsWith('.ts') ? options.module : `${options.module}.ts`;
      const parsedPath = dynamicPathParser(this.project, modulePath);
      this.pathToModule = path.join(this.project.root, parsedPath.dir, parsedPath.base);

      if (!fs.existsSync(this.pathToModule)) {
        throw 'Module specified does not exist';
      }
    } else {
      try {
        this.pathToModule = findParentModule(this.project, this.dynamicPath.dir);
      } catch(e) {
        if (!options.skipImport) {
          throw `Error locating module for declaration\n\t${e}`;
        }
      }
    }
  },

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;

    var defaultPrefix = '';
    if (this.project.ngConfig &&
        this.project.ngConfig.apps[0] &&
        this.project.ngConfig.apps[0].prefix) {
      defaultPrefix = this.project.ngConfig.apps[0].prefix;
    }

    var prefix = (this.options.prefix === 'false' || this.options.prefix === '') ? '' : (this.options.prefix || defaultPrefix);
    prefix = prefix && `${prefix}-`;

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

    options.inlineStyle = options.inlineStyle !== undefined ?
      options.inlineStyle :
      this.project.ngConfigObj.get('defaults.inline.style');

    options.inlineTemplate = options.inlineTemplate !== undefined ?
      options.inlineTemplate :
      this.project.ngConfigObj.get('defaults.inline.template');

    options.spec = options.spec !== undefined ?
      options.spec :
      this.project.ngConfigObj.get('defaults.spec.component');

    options.viewEncapsulation = options.viewEncapsulation !== undefined ?
      options.viewEncapsulation :
      this.project.ngConfigObj.get('defaults.viewEncapsulation');

    options.changeDetection = options.changeDetection !== undefined ?
      options.changeDetection :
      this.project.ngConfigObj.get('defaults.changeDetection');

    return {
      dynamicPath: this.dynamicPath.dir.replace(this.dynamicPath.appRoot, ''),
      flat: options.flat,
      spec: options.spec,
      inlineTemplate: options.inlineTemplate,
      inlineStyle: options.inlineStyle,
      route: options.route,
      isAppComponent: !!options.isAppComponent,
      selector: this.selector,
      styleExt: this.styleExt,
      viewEncapsulation: options.viewEncapsulation,
      changeDetection: options.changeDetection
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
    const className = stringUtils.classify(`${options.entity.name}Component`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.component`);
    const componentDir = path.relative(path.dirname(this.pathToModule), this.generatePath);
    const importPath = componentDir ? `./${componentDir}/${fileName}` : `./${fileName}`;

    if (!options.skipImport) {
      returns.push(
        astUtils.addDeclarationToModule(this.pathToModule, className, importPath)
          .then(change => change.apply(NodeHost)));
      this._writeStatusToUI(chalk.yellow, 'update', path.relative(this.project.root, this.pathToModule));
    }

    return Promise.all(returns);
  }
};
