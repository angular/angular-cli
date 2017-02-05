import {NodeHost} from '../../lib/ast-tools';
import { oneLine } from 'common-tags';

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const Blueprint = require('../../ember-cli/lib/models/blueprint');
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: true },
    { name: 'spec', type: Boolean },
    { name: 'module', type: String, aliases: ['m'] }
  ],

  beforeInstall: function(options: any) {
    if (options.module) {
      // Resolve path to module
      const modulePath = options.module.endsWith('.ts') ? options.module : `${options.module}.ts`;
      const parsedPath = dynamicPathParser(this.project, modulePath);
      this.pathToModule = path.join(this.project.root, parsedPath.dir, parsedPath.base);

      if (!fs.existsSync(this.pathToModule)) {
        throw 'Module specified does not exist';
      }
    }
  },

  normalizeEntityName: function (entityName: string) {
    const parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    options.spec = options.spec !== undefined ?
      options.spec :
      this.project.ngConfigObj.get('defaults.spec.service');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat
    };
  },

  files: function() {
    let fileList = getFiles.call(this) as Array<string>;

    if (this.options && !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.service.spec.ts') < 0);
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
        Service is generated but not provided,
        it must be provided to be used
      `;
      this._writeStatusToUI(chalk.yellow, 'WARNING', warningMessage);
    } else {
      const className = stringUtils.classify(`${options.entity.name}Service`);
      const fileName = stringUtils.dasherize(`${options.entity.name}.service`);
      const fullGeneratePath = path.join(this.project.root, this.generatePath);
      const moduleDir = path.parse(this.pathToModule).dir;
      const relativeDir = path.relative(moduleDir, fullGeneratePath);
      const importPath = relativeDir ? `./${relativeDir}/${fileName}` : `./${fileName}`;
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
