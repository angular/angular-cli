import {CliConfig} from '../../models/config';
import {getAppFromConfig} from '../../utilities/app-utils';
import {dynamicPathParser} from '../../utilities/dynamic-path-parser';

const stringUtils = require('ember-cli-string-utils');
const Blueprint = require('../../ember-cli/lib/models/blueprint');

export default Blueprint.extend({
  description: '',
  aliases: ['i'],

  anonymousOptions: [
    '<interface-type>'
  ],

  availableOptions: [
    {
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    }
  ],

  normalizeEntityName: function (entityName: string) {
    const appConfig = getAppFromConfig(this.options.app);
    const parsedPath = dynamicPathParser(this.project, entityName, appConfig);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    const interfaceType = options.args[2];
    this.fileName = stringUtils.dasherize(options.entity.name);
    if (interfaceType) {
      this.fileName += '.' + interfaceType;
    }
    const prefix = CliConfig.getValue('defaults.interface.prefix');
    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      fileName: this.fileName,
      prefix: prefix
    };
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
