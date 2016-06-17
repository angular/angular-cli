'use strict';

const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const addBarrelRegistration = require('../../utilities/barrel-management');
const path = require('path');
var Blueprint = require('ember-cli/lib/models/blueprint');
var getFiles = Blueprint.prototype.files;

module.exports = {
  description: 'Generates a guard to be used in routing.',

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

  files: function() {
    var fileList = getFiles.call(this);

    if (this.options && this.options.flat) {
      fileList = fileList.filter(p => p.indexOf('index.ts') <= 0);
    }

    return fileList;
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
    if (!options.flat) {
      return addBarrelRegistration(
        this,
        this.generatePath);
    } else {
      return addBarrelRegistration(
        this,
        this.generatePath,
        options.entity.name + '.guard');
    }
  }
};
