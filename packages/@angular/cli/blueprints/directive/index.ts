const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');
const findParentModule = require('../../utilities/find-parent-module').default;
const NodeHost = require('@angular-cli/ast-tools').NodeHost;
const Blueprint = require('../../ember-cli/lib/models/blueprint');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: true },
    { name: 'prefix', type: String, default: null },
    { name: 'spec', type: Boolean },
    { name: 'skip-import', type: Boolean, default: false },
    { name: 'module', type: String, aliases: ['m'] },
    { name: 'export', type: Boolean, default: false }
  ],

  beforeInstall: function(options: any) {
    if (options.module) {
      // Resolve path to module
      const modulePath = options.module.endsWith('.ts') ? options.module : `${options.module}.ts`;
      const parsedPath = dynamicPathParser(this.project, modulePath);
      this.pathToModule = path.join(this.project.root, parsedPath.dir, parsedPath.base);

      if (!fs.existsSync(this.pathToModule)) {
        throw ' ';
      }
    } else {
      try {
        this.pathToModule = findParentModule(this.project, this.dynamicPath.dir);
      } catch (e) {
        if (!options.skipImport) {
          throw `Error locating module for declaration\n\t${e}`;
        }
      }
    }
  },

  normalizeEntityName: function (entityName: string) {
    const parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;

    let defaultPrefix = '';
    if (this.project.ngConfig &&
        this.project.ngConfig.apps[0] &&
        this.project.ngConfig.apps[0].prefix) {
      defaultPrefix = this.project.ngConfig.apps[0].prefix;
    }

    let prefix = (this.options.prefix === 'false' || this.options.prefix === '')
                 ? '' : (this.options.prefix || defaultPrefix);
    prefix = prefix && `${prefix}-`;


    this.selector = stringUtils.camelize(prefix + parsedPath.name);
    return parsedPath.name;
  },

  locals: function (options: any) {
    options.spec = options.spec !== undefined ?
      options.spec :
      this.project.ngConfigObj.get('defaults.spec.directive');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      selector: this.selector
    };
  },

  files: function() {
    let fileList = getFiles.call(this) as Array<string>;

    if (this.options && !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.directive.spec.ts') < 0);
    }

    return fileList;
  },

  fileMapTokens: function (options: any) {
    // Return custom template variables here.
    return {
      __path__: () => {
        let dir = this.dynamicPath.dir;
        if (!options.locals.flat) {
          dir += path.sep + options.dasherizedModuleName;
        }
        this.generatePath = dir;
        return dir;
      }
    };
  },

  afterInstall: function(options: any) {
    if (options.dryRun) {
      return;
    }

    const returns: Array<any> = [];
    const className = stringUtils.classify(`${options.entity.name}Directive`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.directive`);
    const fullGeneratePath = path.join(this.project.root, this.generatePath);
    const moduleDir = path.parse(this.pathToModule).dir;
    const relativeDir = path.relative(moduleDir, fullGeneratePath);
    const importPath = relativeDir ? `./${relativeDir}/${fileName}` : `./${fileName}`;

    if (!options.skipImport) {
      returns.push(
        astUtils.addDeclarationToModule(this.pathToModule, className, importPath)
          .then((change: any) => change.apply(NodeHost))
          .then((result: any) => {
            if (options.export) {
              return astUtils.addExportToModule(this.pathToModule, className, importPath)
                .then((change: any) => change.apply(NodeHost));
            }
            return result;
          }));
      this._writeStatusToUI(chalk.yellow,
                            'update',
                            path.relative(this.project.root, this.pathToModule));
    }

    return Promise.all(returns);
  }
});
