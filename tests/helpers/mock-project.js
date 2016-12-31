'use strict';

var Project = require('angular-cli/ember-cli/lib/models/project');
var MockUI = require('./mock-ui');

function MockProject() {
  var root = process.cwd();
  var pkg  = {};
  var ui = new MockUI();
  Project.apply(this, [root, pkg, ui]);
}

MockProject.prototype.require = function(file) {
  if (file === './server') {
    return function() {
      return {
        listen: function() {
          arguments[arguments.length - 1]();
        }
      };
    };
  }
};

MockProject.prototype.config = function() {
  return this._config || {
    baseURL: '/',
    locationType: 'auto'
  };
};

MockProject.prototype.has = function(key) {
  return (/server/.test(key));
};

MockProject.prototype.name = function() {
  return 'mock-project';
};

MockProject.prototype.initializeAddons = Project.prototype.initializeAddons;
MockProject.prototype.hasDependencies = function() {
  return true;
};
MockProject.prototype.discoverAddons = Project.prototype.discoverAddons;
MockProject.prototype.addIfAddon = Project.prototype.addIfAddon;
MockProject.prototype.supportedInternalAddonPaths = Project.prototype.supportedInternalAddonPaths;
MockProject.prototype.setupBowerDirectory = Project.prototype.setupBowerDirectory;
MockProject.prototype.setupNodeModulesPath = Project.prototype.setupNodeModulesPath;
MockProject.prototype.isEmberCLIProject = Project.prototype.isEmberCLIProject;
MockProject.prototype.isEmberCLIAddon = Project.prototype.isEmberCLIAddon;
MockProject.prototype.findAddonByName = Project.prototype.findAddonByName;
MockProject.prototype.dependencies = function() {
  return [];
};
MockProject.prototype.isEmberCLIAddon = function() {
  return false;
};

module.exports = MockProject;
