'use strict';

/**
@module ember-cli
*/

var fs           = require('fs');
var path         = require('path');
var assign       = require('lodash/assign');
var SilentError  = require('silent-error');
var debug        = require('debug')('ember-cli:addon');

var CoreObject = require('../ext/core-object');

var walkSync   = require('walk-sync');

function existsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  }
  catch (e) {
    return false;
  }
}


/**
  Root class for an Addon. If your addon module exports an Object this
  will be extended from this base class. If you export a constructor (function),
  it will **not** extend from this class.

  Hooks:

  - {{#crossLink "Addon/config:method"}}config{{/crossLink}}
  - {{#crossLink "Addon/blueprintsPath:method"}}blueprintsPath{{/crossLink}}
  - {{#crossLink "Addon/includedCommands:method"}}includedCommands{{/crossLink}}
  - {{#crossLink "Addon/serverMiddleware:method"}}serverMiddleware{{/crossLink}}
  - {{#crossLink "Addon/postBuild:method"}}postBuild{{/crossLink}}
  - {{#crossLink "Addon/outputReady:method"}}outputReady{{/crossLink}}
  - {{#crossLink "Addon/preBuild:method"}}preBuild{{/crossLink}}
  - {{#crossLink "Addon/buildError:method"}}buildError{{/crossLink}}
  - {{#crossLink "Addon/included:method"}}included{{/crossLink}}
  - {{#crossLink "Addon/postprocessTree:method"}}postprocessTree{{/crossLink}}
  - {{#crossLink "Addon/treeFor:method"}}treeFor{{/crossLink}}

  @class Addon
  @extends CoreObject
  @constructor
  @param {(Project|Addon)} parent The project or addon that directly depends on this addon
  @param {Project} project The current project (deprecated)
*/
function Addon(parent, project) {
  this.parent = parent;
  this.project = project;
  this.ui = project && project.ui;
  this.addonPackages = {};
  this.addons = [];
}

Addon.__proto__ = CoreObject;
Addon.prototype.constructor = Addon;

Addon.prototype.initializeAddons = function() {
  if (this._addonsInitialized) {
    return;
  }
  this._addonsInitialized = true;
  this.addonPackages = {
    '@angular/cli': {
      name: '@angular/cli',
      path: path.join(__dirname, '../../../'),
      pkg: cliPkg,
    }
  };
};

/**
  Invoke the specified method for each enabled addon.

  @private
  @method eachAddonInvoke
  @param {String} methodName the method to invoke on each addon
  @param {Array} args the arguments to pass to the invoked method
*/
Addon.prototype.eachAddonInvoke = function eachAddonInvoke(methodName, args) {
  this.initializeAddons();

  var invokeArguments = args || [];

  return this.addons.map(function(addon) {
    if (addon[methodName]) {
      return addon[methodName].apply(addon, invokeArguments);
    }
  }).filter(Boolean);
};

/**
  This method is called when the addon is included in a build. You
  would typically use this hook to perform additional imports

  ```js
    included: function(app) {
      app.import(somePath);
    }
  ```

  @public
  @method included
  @param {EmberApp} app The application object
*/
Addon.prototype.included = function(/* app */) {
  if (!this._addonsInitialized) {
    // someone called `this._super.included` without `apply` (because of older
    // core-object issues that prevent a "real" super call from working properly)
    return;
  }

  this.eachAddonInvoke('included', [this]);
};

/**
  Returns the path for addon blueprints.

  @private
  @method blueprintsPath
  @return {String} The path for blueprints
*/
Addon.prototype.blueprintsPath = function() {
  return path.join(this.root, 'blueprints');
};

/**
  Augments the applications configuration settings.
  Object returned from this hook is merged with the application's configuration object.
  Application's configuration always take precedence.


  ```js
    config: function(environment, appConfig) {
      return {
        someAddonDefault: "foo"
      };
    }
  ```

  @public
  @method config
  @param {String} env Name of current environment (ie "developement")
  @param {Object} baseConfig Initial application configuration
  @return {Object} Configuration object to be merged with application configuration.
*/
Addon.prototype.config = function (env, baseConfig) {
  var configPath = path.join(this.root, 'config', 'environment.js');

  if (existsSync(configPath)) {
    var configGenerator = require(configPath);

    return configGenerator(env, baseConfig);
  }
};

/**
  @public
  @method dependencies
  @return {Object} The addon's dependencies based on the addon's package.json
*/
Addon.prototype.dependencies = function() {
  throw new Error()
  var pkg = this.pkg || {};
  return assign({}, pkg['devDependencies'], pkg['dependencies']);
};

/**
  Returns the absolute path for a given addon

  @private
  @method resolvePath
  @param {String} addon Addon name
  @return {String} Absolute addon path
*/
Addon.resolvePath = function(addon) {
  var addonMain = addon.pkg['ember-addon-main'];

  if (addonMain) {
    this.ui && this.ui.writeDeprecateLine(addon.pkg.name + ' is using the deprecated ember-addon-main definition. It should be updated to {\'ember-addon\': {\'main\': \'' + addon.pkg['ember-addon-main'] + '\'}}');
  } else {
    addonMain = (addon.pkg['ember-addon'] && addon.pkg['ember-addon'].main) || addon.pkg['main'] || 'index.js';
  }

  // Resolve will fail unless it has an extension
  if (!path.extname(addonMain)) {
    addonMain += '.js';
  }

  return path.resolve(addon.path, addonMain);
};

/**
  Returns the addon class for a given addon name.
  If the Addon exports a function, that function is used
  as constructor. If an Object is exported, a subclass of
  `Addon` is returned with the exported hash merged into it.

  @private
  @static
  @method lookup
  @param {String} addon Addon name
  @return {Addon} Addon class
*/
Addon.lookup = function(addon) {
  var Constructor, addonModule, modulePath, moduleDir;

  modulePath = Addon.resolvePath(addon);
  moduleDir  = path.dirname(modulePath);

  if (existsSync(modulePath)) {
    addonModule = require(modulePath);

    if (typeof addonModule === 'function') {
      Constructor = addonModule;
      Constructor.prototype.root = Constructor.prototype.root || moduleDir;
      Constructor.prototype.pkg  = Constructor.prototype.pkg || addon.pkg;
    } else {
      Constructor = Addon.extend(assign({
        root: moduleDir,
        pkg: addon.pkg
      }, addonModule));
    }
  }

  if (!Constructor) {
    throw new SilentError('The `' + addon.pkg.name + '` addon could not be found at `' + addon.path + '`.');
  }

  return Constructor;
};

module.exports = Addon;
