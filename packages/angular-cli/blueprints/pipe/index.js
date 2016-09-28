var path = require('path');
var dynamicPathParser = require('../../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli-string-utils');
const astUtils = require('../../utilities/ast-utils');
const findParentModule = require('../../utilities/find-parent-module').default;
const NodeHost = require('@angular-cli/ast-tools').NodeHost;

module.exports = {
  description: '',

  availableOptions: [
    { name: 'flat', type: Boolean, default: true }
  ],

  beforeInstall: function() {
    try {
      this.pathToModule = findParentModule(this.project, this.dynamicPath.dir);
    } catch(e) {
      throw `Error locating module for declaration\n\t${e}`;
    }
  },

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
    const className = stringUtils.classify(`${options.entity.name}Pipe`);
    const fileName = stringUtils.dasherize(`${options.entity.name}.pipe`);
    const componentDir = path.relative(this.dynamicPath.appRoot, this.generatePath);
    const importPath = componentDir ? `./${componentDir}/${fileName}` : `./${fileName}`;

    if (!options['skip-import']) {
      returns.push(
        astUtils.addDeclarationToModule(this.pathToModule, className, importPath)
          .then(change => change.apply(NodeHost)));
    }

    return Promise.all(returns);
  }
};
