import * as chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { NodeHost } from '../../lib/ast-tools';
import { CliConfig } from '../../models/config';
import { getAppFromConfig } from '../../utilities/app-utils';
import { dynamicPathParser } from '../../utilities/dynamic-path-parser';
import { resolveModulePath } from '../../utilities/resolve-module-file';

const Blueprint = require('../../ember-cli/lib/models/blueprint');
const findParentModule = require('../../utilities/find-parent-module').default;
const getFiles = Blueprint.prototype.files;
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');

const viewEncapsulationMap: any = {
  'emulated': 'Emulated',
  'native': 'Native',
  'none': 'None'
};

const changeDetectionMap: any = {
  'default': 'Default',
  'onpush': 'OnPush'
};

function correctCase(options: any) {
  if (options.viewEncapsulation) {
    options.viewEncapsulation = viewEncapsulationMap[options.viewEncapsulation.toLowerCase()];
  }

  if (options.changeDetection) {
    options.changeDetection = changeDetectionMap[options.changeDetection.toLowerCase()];
  }
}

export default Blueprint.extend({
  description: '',
  aliases: ['c'],

  availableOptions: [
    {
      name: 'flat',
      type: Boolean,
      description: 'Flag to indicate if a dir is created.'
    },
    {
      name: 'inline-template',
      type: Boolean,
      aliases: ['it'],
      description: 'Specifies if the template will be in the ts file.'
    },
    {
      name: 'inline-style',
      type: Boolean,
      aliases: ['is'],
      description: 'Specifies if the style will be in the ts file.'
    },
    {
      name: 'prefix',
      type: String,
      default: null,
      description: 'Specifies whether to use the prefix.'
    },
    {
      name: 'spec',
      type: Boolean,
      description: 'Specifies if a spec file is generated.'
    },
    {
      name: 'view-encapsulation',
      type: String,
      aliases: ['ve'],
      description: 'Specifies the view encapsulation strategy.'
    },
    {
      name: 'change-detection',
      type: String,
      aliases: ['cd'],
      description: 'Specifies the change detection strategy.'
    },
    {
      name: 'skip-import',
      type: Boolean,
      default: false,
      description: 'Allows for skipping the module import.'
    },
    {
      name: 'module',
      type: String,
      aliases: ['m'],
      description: 'Allows specification of the declaring module.'
    },
    {
      name: 'export',
      type: Boolean,
      default: false,
      description: 'Specifies if declaring module exports the component.'
    },
    {
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    }
  ],

  beforeInstall: function (options: any) {
    const appConfig = getAppFromConfig(this.options.app);
    if (options.module) {
      this.pathToModule =
        resolveModulePath(options.module, this.project, this.project.root, appConfig);
    } else {
      try {
        this.pathToModule = findParentModule(this.project.root, appConfig.root, this.generatePath);
      } catch (e) {
        if (!options.skipImport) {
          throw `Error locating module for declaration\n\t${e}`;
        }
      }
    }
  },

  normalizeEntityName: function (entityName: string) {
    const appConfig = getAppFromConfig(this.options.app);
    const parsedPath = dynamicPathParser(this.project, entityName, appConfig);

    this.dynamicPath = parsedPath;

    const defaultPrefix = (appConfig && appConfig.prefix) || '';

    let prefix = (this.options.prefix === 'false' || this.options.prefix === '')
      ? '' : (this.options.prefix || defaultPrefix);
    prefix = prefix && `${prefix}-`;

    this.selector = stringUtils.dasherize(prefix + parsedPath.name);

    if (this.selector.indexOf('-') === -1) {
      this._writeStatusToUI(chalk.yellow, 'WARNING', 'selectors should contain a dash');
    }

    return parsedPath.name;
  },

  locals: function (options: any) {
    this.styleExt = CliConfig.getValue('defaults.styleExt') || 'css';

    options.inlineStyle = options.inlineStyle !== undefined ?
      options.inlineStyle : CliConfig.getValue('defaults.component.inlineStyle');

    options.inlineTemplate = options.inlineTemplate !== undefined ?
      options.inlineTemplate : CliConfig.getValue('defaults.component.inlineTemplate');

    options.flat = options.flat !== undefined ?
      options.flat : CliConfig.getValue('defaults.component.flat');

    options.spec = options.spec !== undefined ?
      options.spec : CliConfig.getValue('defaults.component.spec');

    options.viewEncapsulation = options.viewEncapsulation !== undefined ?
      options.viewEncapsulation : CliConfig.getValue('defaults.component.viewEncapsulation');

    options.changeDetection = options.changeDetection !== undefined ?
      options.changeDetection : CliConfig.getValue('defaults.component.changeDetection');

    correctCase(options);

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

  files: function () {
    let fileList = getFiles.call(this) as Array<string>;

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

  fileMapTokens: function (options: any) {
    const appConfig = getAppFromConfig(this.options.app);

    // Return custom template variables here.
    return {
      __path__: () => {
        let dir = this.dynamicPath.dir;
        if (!options.locals.flat) {
          dir += path.sep + options.dasherizedModuleName;
        }
        const srcDir = appConfig.root;
        this.appDir = dir.substr(dir.indexOf(srcDir) + srcDir.length);
        this.generatePath = dir;
        return dir;
      },
      __styleext__: () => {
        return this.styleExt;
      }
    };
  },

  afterInstall: function (options: any) {
    const returns: Array<any> = [];
    const className = stringUtils.classify(`${options.entity.name}Component`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.component`);
    const componentDir = path.relative(path.dirname(this.pathToModule), this.generatePath);
    const importPath = componentDir ? `./${componentDir}/${fileName}` : `./${fileName}`;

    if (!options.skipImport) {
      if (options.dryRun) {
        this._writeStatusToUI(chalk.yellow,
          'update',
          path.relative(this.project.root, this.pathToModule));
        return;
      }
      const preChange = fs.readFileSync(this.pathToModule, 'utf8');

      returns.push(
        astUtils.addDeclarationToModule(this.pathToModule, className, importPath)
          .then((change: any) => change.apply(NodeHost))
          .then((result: any) => {
            if (options.export) {
              return astUtils.addExportToModule(this.pathToModule, className, importPath)
                .then((change: any) => change.apply(NodeHost));
            }
            return result;
          })
          .then(() => {
            const postChange = fs.readFileSync(this.pathToModule, 'utf8');
            let moduleStatus = 'update';

            if (postChange === preChange) {
              moduleStatus = 'identical';
            }

            this._writeStatusToUI(chalk.yellow,
              moduleStatus,
              path.relative(this.project.root, this.pathToModule));
          }));
    }

    return Promise.all(returns);
  }
});
