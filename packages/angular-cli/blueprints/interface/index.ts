const stringUtils = require('ember-cli-string-utils');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const Blueprint = require('../../ember-cli/lib/models/blueprint');

export default Blueprint.extend({
  description: '',

  anonymousOptions: [
    '<interface-type>'
  ],

  normalizeEntityName: function (entityName: string) {
    const parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    const interfaceType = options.args[2];
    this.fileName = stringUtils.dasherize(options.entity.name);
    if (interfaceType) {
      this.fileName += '.' + interfaceType;
    }
    let prefix = '';
    if (this.project.ngConfig &&
        this.project.ngConfig.defaults &&
        this.project.ngConfig.defaults.prefixInterfaces) {
      prefix = 'I';
    }
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
