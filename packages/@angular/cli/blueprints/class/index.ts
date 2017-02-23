import {getAppFromConfig} from '../../utilities/app-utils';
import {CliConfig} from '../../models/config';

const stringUtils = require('ember-cli-string-utils');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const Blueprint = require('../../ember-cli/lib/models/blueprint');
const getFiles = Blueprint.prototype.files;

export default Blueprint.extend({
  description: '',

  availableOptions: [
    {
      name: 'spec',
      type: Boolean,
      description: 'Specifies if a spec file is generated.'
    },
    {
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    }
  ],

  normalizeEntityName: function (entityName: string) {
    const cliConfig = CliConfig.fromProject();
    const ngConfig = cliConfig && cliConfig.config;
    const appConfig = getAppFromConfig(ngConfig.apps, this.options.app);
    const parsedPath = dynamicPathParser(this.project, entityName.split('.')[0], appConfig);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    const rawName = options.args[1] as string;
    const nameParts = rawName.split('.')
      .filter(part => part.length !== 0);

    const classType = nameParts[1];
    this.fileName = stringUtils.dasherize(options.entity.name);
    if (classType) {
      this.fileName += '.' + classType.toLowerCase();
    }

    const cliConfig = CliConfig.fromProject();
    options.spec = options.spec !== undefined ?
      options.spec :
      cliConfig && cliConfig.get('defaults.class.spec');

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      fileName: this.fileName
    };
  },

  files: function() {
    let fileList = getFiles.call(this) as Array<string>;

    if (this.options && !this.options.spec) {
      fileList = fileList.filter(p => p.indexOf('__name__.spec.ts') < 0);
    }

    return fileList;
  },

  fileMapTokens: function () {
    // Return custom template variables here.
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir;
        return this.generatePath;
      },
      __name__: () => {
        return this.fileName;
      }
    };
  }
});
