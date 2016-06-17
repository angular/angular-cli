'use strict';

const Blueprint = require('ember-cli/lib/models/blueprint');
const path = require('path');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli-string-utils');

function getRoutePrefix(project) {
  if (project.ngConfig &&
      project.ngConfig.defaults &&
      project.ngConfig.defaults.lazyRoutePrefix !== undefined) {
    return project.ngConfig.defaults.lazyRoutePrefix;
  }

  return '+';
}

module.exports = {
  description: 'Generates a route and a corresponding component.',

  availableOptions: [
    { name: 'lazy', type: Boolean, default: true },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'prefix', type: Boolean, default: true }
  ],

  beforeInstall: function(options) {
    options.route = true;

    if (options.lazy) {
      options.isLazyRoute = true;
    }

    return Blueprint.load(path.join(__dirname, '..', 'component')).install(options);
  },

  normalizeEntityName: function (entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);

    if (parsedPath.name[0] === getRoutePrefix(this.project)) {
      var index = entityName.lastIndexOf(parsedPath.name);
      entityName = entityName.substr(0, index) + entityName.substr(index + 1);
    }

    this.dynamicPath = parsedPath;

    //leave the entity name intact for component generation
    return entityName;
  },

  locals: function (options) {
    return {
      dynamicPath: this.dynamicPath.dir.replace(this.dynamicPath.appRoot, ''),
      screamingSnakeCaseModuleName: stringUtils.underscore(stringUtils.dasherize(options.entity.name)).toUpperCase()
    };
  },

  fileMapTokens: function (options) {
    // Return custom template variables here.
    return {
      __path__: () => {
        var dir = this.dynamicPath.dir;
        var lazyPrefix = this.options.lazy ? getRoutePrefix(this.project) : '';

        if (!options.locals.flat) {
          dir += path.sep + lazyPrefix + options.dasherizedModuleName;
        }

        return dir;
      }
    };
  }
};
