import {getAppFromConfig} from '../../utilities/app-utils';

const path = require('path');
const stringUtils = require('ember-cli-string-utils');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const Blueprint = require('../../ember-cli/lib/models/blueprint');

export default Blueprint.extend({
  description: '',

  availableOptions: [
    {
      name: 'flat',
      type: Boolean,
      description: 'Flag to indicate if a dir is created.'
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
    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      fileName: this.fileName
    };
  },

  fileMapTokens: function (options: any) {
    // Return custom template variables here.
    return {
      __path__: () => {
        this.generatePath = this.dynamicPath.dir;
         if (!options.locals.flat) {
            this.generatePath += path.sep + options.dasherizedModuleName;
          }
        return this.generatePath;
      },
      __name__: () => {
        return this.fileName;
      }
    };
  }
});
