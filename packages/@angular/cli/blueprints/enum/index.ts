const stringUtils = require('ember-cli-string-utils');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const Blueprint = require('../../ember-cli/lib/models/blueprint');

export default Blueprint.extend({
  description: '',

  normalizeEntityName: function (entityName: string) {
    const parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options: any) {
    this.fileName = stringUtils.dasherize(options.entity.name);

    return {
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat,
      fileName: this.fileName
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
