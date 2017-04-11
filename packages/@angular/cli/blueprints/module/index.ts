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

export default Blueprint.extend({
  description: '',
  aliases: ['m'],

  availableOptions: [
    {
      name: 'spec',
      type: Boolean,
      description: 'Specifies if a spec file is generated.'
    },
    {
      name: 'flat',
      type: Boolean,
      description: 'Flag to indicate if a dir is created.'
    },
    {
      name: 'routing',
      type: Boolean,
      default: false,
      description: 'Specifies if a routing module file should be generated.'
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
      description: 'Specifies if declaring module exports the module.'
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
      this.pathToModule = resolveModulePath(options.module, this.project, this.project.root, appConfig);
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
    this.entityName = entityName;
    const appConfig = getAppFromConfig(this.options.app);
    const parsedPath = dynamicPathParser(this.project, entityName, appConfig);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    options.flat = options.flat !== undefined ?
      options.flat : CliConfig.getValue('defaults.module.flat');

    options.spec = options.spec !== undefined ?
      options.spec : CliConfig.getValue('defaults.module.spec');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      spec: options.spec,
      routing: options.routing
    };
  },

  files: function() {
    let fileList = getFiles.call(this) as Array<string>;

    if (!this.options || !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.module.spec.ts') < 0);
    }
    if (this.options && !this.options.routing) {
      fileList = fileList.filter(p => p.indexOf('__name__-routing.module.ts') < 0);
    }

    return fileList;
  },

  fileMapTokens: function (options: any) {
    // Return custom template variables here.
    this.dasherizedModuleName = options.dasherizedModuleName;
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir;
        if (!options.locals.flat) {
          this.generatePath += path.sep + options.dasherizedModuleName;
        }
        return this.generatePath;
      }
    };
  },

  afterInstall: function (options: any) {
    const returns: Array<any> = [];
    const className = stringUtils.classify(`${this.normalizeEntityName(options.entity.name)}Module`);
    const fileName = stringUtils.dasherize(`${this.normalizeEntityName(options.entity.name)}.module`);
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
        astUtils.addImportToModule(this.pathToModule, className, importPath)
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
