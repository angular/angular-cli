import * as chalk from 'chalk';
import * as path from 'path';
import { oneLine } from 'common-tags';
import { NodeHost } from '../../lib/ast-tools';
import { CliConfig } from '../../models/config';
import { dynamicPathParser } from '../../utilities/dynamic-path-parser';
import { getAppFromConfig } from '../../utilities/app-utils';
import { resolveModulePath } from '../../utilities/resolve-module-file';

const Blueprint = require('../../ember-cli/lib/models/blueprint');
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  name: 'guard',
  description: '',
  aliases: ['g'],

  availableOptions: [
    {
      name: 'flat',
      type: Boolean,
      description: 'Indicate if a dir is created.'
    },
    {
      name: 'spec',
      type: Boolean,
      description: 'Specifies if a spec file is generated.'
    },
    {
      name: 'module',
      type: String,
      aliases: ['m'],
      description: 'Specifies where the guard should be provided.'
    }
  ],

  beforeInstall: function (options: any) {
    if (options.module) {
      const appConfig = getAppFromConfig(this.options.app);
      this.pathToModule =
        resolveModulePath(options.module, this.project, this.project.root, appConfig);
    }
  },

  normalizeEntityName: function (entityName: string) {
    const appConfig = getAppFromConfig(this.options.app);
    const parsedPath = dynamicPathParser(this.project, entityName, appConfig);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    options.flat = options.flat !== undefined ?
      options.flat : CliConfig.getValue('defaults.guard.flat');

    options.spec = options.spec !== undefined ?
      options.spec : CliConfig.getValue('defaults.guard.spec');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat
    };
  },

  files: function () {
    let fileList = getFiles.call(this) as Array<string>;

    if (this.options && !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.guard.spec.ts') < 0);
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

  afterInstall(options: any) {
    const returns: Array<any> = [];

    if (!this.pathToModule) {
      const warningMessage = oneLine`
        Guard is generated but not provided,
        it must be provided to be used
      `;
      this._writeStatusToUI(chalk.yellow, 'WARNING', warningMessage);
    } else {
      if (options.dryRun) {
        this._writeStatusToUI(chalk.yellow,
          'update',
          path.relative(this.project.root, this.pathToModule));
        return;
      }

      const className = stringUtils.classify(`${options.entity.name}Guard`);
      const fileName = stringUtils.dasherize(`${options.entity.name}.guard`);
      const fullGeneratePath = path.join(this.project.root, this.generatePath);
      const moduleDir = path.parse(this.pathToModule).dir;
      const relativeDir = path.relative(moduleDir, fullGeneratePath);
      const normalizeRelativeDir = relativeDir.startsWith('.') ? relativeDir : `./${relativeDir}`;
      const importPath = relativeDir ? `${normalizeRelativeDir}/${fileName}` : `./${fileName}`;
      returns.push(
        astUtils.addProviderToModule(this.pathToModule, className, importPath)
          .then((change: any) => change.apply(NodeHost)));
      this._writeStatusToUI(chalk.yellow,
        'update',
        path.relative(this.project.root, this.pathToModule));
    }

    return Promise.all(returns);
  }
});
