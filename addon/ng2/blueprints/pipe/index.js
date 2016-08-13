var path = require('path');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');

module.exports = {
  description: '',
  
  availableOptions: [
    { name: 'flat', type: Boolean, default: true }
  ],

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    this.dynamicPath = parsedPath;
    return parsedPath.name;
  },

  locals: function (options) {
    return { 
      dynamicPath: this.dynamicPath.dir,
      flat: options.flat
    };
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __path__: () => {
        var dir = this.dynamicPath.dir;
        if (!options.locals.flat) {
          dir += path.sep + options.dasherizedModuleName;
        }
        this.generatePath = dir;
        return dir;
      }
    };
  },
  
  afterInstall: function(options) {
    if (options.dryRun) {
      return;
    }

    const returns = [];
    const modulePath = path.join(this.project.root, this.dynamicPath.appRoot, 'app.module.ts');
    const className = stringUtils.classify(`${options.entity.name}Pipe`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.pipe`);
    const componentDir = path.relative(this.dynamicPath.appRoot, this.generatePath);
    const importPath = componentDir ? `./${componentDir}/${fileName}` : `./${fileName}`;

    if (!options['skip-import']) {
      returns.push(
        astUtils.addComponentToModule(modulePath, className, importPath)
          .then(change => change.apply()));
    }

    return Promise.all(returns);
  }
};
