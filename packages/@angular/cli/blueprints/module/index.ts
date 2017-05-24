import * as chalk from 'chalk';
import * as path from 'path';
import { oneLine } from 'common-tags';
import { NodeHost } from '../../lib/ast-tools';
import { CliConfig } from '../../models/config';
import { getAppFromConfig } from '../../utilities/app-utils';
import { resolveModulePath } from '../../utilities/resolve-module-file';
import { dynamicPathParser, DynamicPathOptions } from '../../utilities/dynamic-path-parser';

const stringUtils = require('ember-cli-string-utils');
const Blueprint = require('../../ember-cli/lib/models/blueprint');
const astUtils = require('../../utilities/ast-utils');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  name: 'module',
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
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    },
    {
      name: 'module',
      type: String, aliases: ['m'],
      description: 'Specifies where the module should be imported.'
    }
  ],

  beforeInstall: function(options: any) {
    if (options.module) {
      const appConfig = getAppFromConfig(this.options.app);
      this.pathToModule =
        resolveModulePath(options.module, this.project, this.project.root, appConfig);
    }
  },

  normalizeEntityName: function (entityName: string) {
    this.entityName = entityName;
    const appConfig = getAppFromConfig(this.options.app);
    const dynamicPathOptions: DynamicPathOptions = {
      project: this.project,
      entityName,
      appConfig,
      dryRun: this.options.dryRun
    };
    const parsedPath = dynamicPathParser(dynamicPathOptions);

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

  files: function () {
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

  afterInstall(options: any) {
    const returns: Array<any> = [];

    if (!this.pathToModule) {
      const warningMessage = oneLine`
        Module is generated but not provided,
        it must be provided to be used
      `;
      this._writeStatusToUI(chalk.yellow, 'WARNING', warningMessage);
    } else {
      let className = stringUtils.classify(`${options.entity.name}Module`);
      let fileName = stringUtils.dasherize(`${options.entity.name}.module`);
      if (options.routing) {
        className = stringUtils.classify(`${options.entity.name}RoutingModule`);
        fileName = stringUtils.dasherize(`${options.entity.name}-routing.module`);
      }
      const fullGeneratePath = path.join(this.project.root, this.generatePath);
      const moduleDir = path.parse(this.pathToModule).dir;
      const relativeDir = path.relative(moduleDir, fullGeneratePath);
      const importPath = relativeDir ? `./${relativeDir}/${fileName}` : `./${fileName}`;
      returns.push(
        astUtils.addImportToModule(this.pathToModule, className, importPath)
          .then((change: any) => change.apply(NodeHost)));
      this._writeStatusToUI(chalk.yellow,
                            'update',
                            path.relative(this.project.root, this.pathToModule));
    }

    return Promise.all(returns);
  }
});
