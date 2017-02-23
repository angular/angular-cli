'use strict';

/**
@module ember-cli
*/
var Promise            = require('../ext/promise');
var path               = require('path');
var findUp             = require('../../../utilities/find-up').findUp;
var resolve            = Promise.denodeify(require('resolve'));
var fs                 = require('fs');
var find               = require('lodash/find');
var assign             = require('lodash/assign');
var forOwn             = require('lodash/forOwn');
var merge              = require('lodash/merge');
var debug              = require('debug')('ember-cli:project');
var Command            = require('../models/command');
var UI                 = require('../ui');
var nodeModulesPath    = require('node-modules-path');
var getPackageBaseName = require('../utilities/get-package-base-name');

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
  The Project model is tied to your package.json. It is instiantiated
  by giving Project.closest the path to your project.

  @class Project
  @constructor
  @param {String} root Root directory for the project
  @param {Object} pkg  Contents of package.json
*/
function Project(root, pkg, ui, cli) {
  debug('init root: %s', root);
  this.root          = root;
  this.pkg           = pkg;
  this.ui            = ui;
  this.cli           = cli;
  this.addonPackages = {};
  this.addons = [];
  this.liveReloadFilterPatterns = [];
  this.setupNodeModulesPath();
  this._watchmanInfo = {
    enabled: false,
    version: null,
    canNestRoots: false
  };
}

Project.prototype.hasDependencies = function() {
  return !!this.nodeModulesPath;
};
/**
  Sets the path to the node_modules directory for this
  project.

  @private
  @method setupNodeModulesPath
 */
Project.prototype.setupNodeModulesPath = function() {
  this.nodeModulesPath = nodeModulesPath(this.root);
  debug('nodeModulesPath: %s', this.nodeModulesPath);
};

var processCwd = process.cwd();
// ensure NULL_PROJECT is a singleton
var NULL_PROJECT;

Project.nullProject = function (ui, cli) {
  if (NULL_PROJECT) { return NULL_PROJECT; }

  NULL_PROJECT = new Project(processCwd, {}, ui, cli);

  NULL_PROJECT.isEmberCLIProject = function() {
    return false;
  };

  NULL_PROJECT.isEmberCLIAddon = function() {
    return false;
  };

  NULL_PROJECT.name = function() {
    return path.basename(process.cwd());
  };

  NULL_PROJECT.initializeAddons();

  return NULL_PROJECT;
};

/**
  Returns the name from package.json.

  @private
  @method name
  @return {String} Package name
 */
Project.prototype.name = function() {
  return getPackageBaseName(this.pkg.name);
};

/**
  Returns whether or not this is an Ember CLI project.
  This checks whether ember-cli is listed in devDependencies.

  @private
  @method isEmberCLIProject
  @return {Boolean} Whether this is an Ember CLI project
 */
Project.prototype.isEmberCLIProject = function() {
  return 'angular-cli' in this.dependencies()
      || '@angular/cli' in this.dependencies();
};

/**
  Returns whether or not this is an Ember CLI addon.

  @method isEmberCLIAddon
  @return {Boolean} Whether or not this is an Ember CLI Addon.
 */
Project.prototype.isEmberCLIAddon = function() {
  return !!this.pkg.keywords && this.pkg.keywords.indexOf('ember-addon') > -1;
};

/**
  Loads the configuration for this project and its addons.

  @private
  @method config
  @param  {String} env Environment name
  @return {Object}     Merged confiration object
 */
Project.prototype.config = function(env) {
  this.initializeAddons();

  var initialConfig = {};

  return this.addons.reduce(function(config, addon) {
    if (addon.config) {
      merge(config, addon.config(env, config));
    }

    return config;
  }, initialConfig);
};

/**
  Returns whether or not the given file name is present in this project.

  @private
  @method has
  @param  {String}  file File name
  @return {Boolean}      Whether or not the file is present
 */
Project.prototype.has = function(file) {
  return existsSync(path.join(this.root, file)) || existsSync(path.join(this.root, file + '.js'));
};

/**
  Resolves the absolute path to a file.

  @private
  @method resolve
  @param  {String} file File to resolve
  @return {String}      Absolute path to file
 */
Project.prototype.resolve = function(file) {
  return resolve(file, {
    basedir: this.root
  });
};

/**
  Resolves the absolute path to a file synchronously

  @private
  @method resolveSync
  @param  {String} file File to resolve
  @return {String}      Absolute path to file
 */
Project.prototype.resolveSync = function(file) {
  return resolve.sync(file, {
    basedir: this.root
  });
};

/**
  Calls `require` on a given module.

  @private
  @method require
  @param  {String} file File path or module name
  @return {Object}      Imported module
 */
Project.prototype.require = function(file) {
  if (/^\.\//.test(file)) { // Starts with ./
    return require(path.join(this.root, file));
  } else {
    return require(path.join(this.nodeModulesPath, file));
  }
};

/**
  Returns the dependencies from a package.json

  @private
  @method dependencies
  @param  {Object}  pkg            Package object. If false, the current package is used.
  @param  {Boolean} excludeDevDeps Whether or not development dependencies should be excluded, defaults to false.
  @return {Object}                 Dependencies
 */
Project.prototype.dependencies = function(pkg, excludeDevDeps) {
  pkg = pkg || this.pkg || {};

  var devDependencies = pkg['devDependencies'];
  if (excludeDevDeps) {
    devDependencies = {};
  }

  return assign({}, devDependencies, pkg['dependencies']);
};

/**
  Provides the list of paths to consult for addons that may be provided
  internally to this project. Used for middleware addons with built-in support.

  @private
  @method supportedInternalAddonPaths
*/
Project.prototype.supportedInternalAddonPaths = function() {
  if (!this.root) { return []; }

  var internalMiddlewarePath = path.join(__dirname, '../tasks/server/middleware');

  return [
    path.join(internalMiddlewarePath, 'tests-server'),
    path.join(internalMiddlewarePath, 'history-support'),
    path.join(internalMiddlewarePath, 'serve-files'),
    path.join(internalMiddlewarePath, 'proxy-server')
  ];
};

/**
  Loads and initializes all addons for this project.

  @private
  @method initializeAddons
 */
Project.prototype.initializeAddons = function() {
  if (this._addonsInitialized) {
    return;
  }
  this._addonsInitialized = true;

  debug('initializeAddons for: %s', this.name());

  const cliPkg = require(path.resolve(__dirname, '../../../package.json'));
  const Addon = require('../models/addon');
  const Constructor = Addon.lookup({
    name: '@angular/cli',
    path: path.join(__dirname, '../../../'),
    pkg: cliPkg,
  });

  const addon = new Constructor(this.addonParent, this);
  this.addons = [addon];
};

/**
  Returns what commands are made available by addons by inspecting
  `includedCommands` for every addon.

  @private
  @method addonCommands
  @return {Object} Addon names and command maps as key-value pairs
 */
Project.prototype.addonCommands = function() {
  var commands = {};
  this.addons.forEach(function(addon) {
    var includedCommands = (addon.includedCommands && addon.includedCommands()) || {};
    var addonCommands = {};

    for (var key in includedCommands) {
      if (typeof includedCommands[key] === 'function') {
        addonCommands[key] = includedCommands[key];
      } else {
        addonCommands[key] = Command.extend(includedCommands[key]);
      }
    }
    if (Object.keys(addonCommands).length) {
      commands[addon.name] = addonCommands;
    }
  });
  return commands;
};

/**
  Execute a given callback for every addon command.
  Example:

  ```
  project.eachAddonCommand(function(addonName, commands) {
    console.log('Addon ' + addonName + ' exported the following commands:' + commands.keys().join(', '));
  });
  ```

  @private
  @method eachAddonCommand
  @param  {Function} callback [description]
 */
Project.prototype.eachAddonCommand = function(callback) {
  if (this.initializeAddons && this.addonCommands) {
    this.initializeAddons();
    var addonCommands = this.addonCommands();

    forOwn(addonCommands, function(commands, addonName) {
      return callback(addonName, commands);
    });
  }
};

/**
  Path to the blueprints for this project.

  @private
  @method localBlueprintLookupPath
  @return {String} Path to blueprints
 */
Project.prototype.localBlueprintLookupPath = function() {
  return path.join(this.root, 'blueprints');
};

/**
  Returns a list of paths (including addon paths) where blueprints will be looked up.

  @private
  @method blueprintLookupPaths
  @return {Array} List of paths
 */
Project.prototype.blueprintLookupPaths = function() {
  return this.addonBlueprintLookupPaths();
};

/**
  Returns a list of addon paths where blueprints will be looked up.

  @private
  @method addonBlueprintLookupPaths
  @return {Array} List of paths
 */
Project.prototype.addonBlueprintLookupPaths = function() {
  var addonPaths = this.addons.map(function(addon) {
    if (addon.blueprintsPath) {
      return addon.blueprintsPath();
    }
  }, this);

  return addonPaths.filter(Boolean).reverse();
};

/**
  Reloads package.json

  @private
  @method reloadPkg
  @return {Object} Package content
 */
Project.prototype.reloadPkg = function() {
  var pkgPath = path.join(this.root, 'package.json');

  // We use readFileSync instead of require to avoid the require cache.
  this.pkg = JSON.parse(fs.readFileSync(pkgPath, { encoding: 'utf-8' }));

  return this.pkg;
};

/**
  Re-initializes addons.

  @private
  @method reloadAddons
 */
Project.prototype.reloadAddons = function() {
  this.reloadPkg();
  this._addonsInitialized = false;
  return this.initializeAddons();
};

/**
  Find an addon by its name

  @private
  @method findAddonByName
  @param  {String} name Addon name as specified in package.json
  @return {Addon}       Addon instance
 */
Project.prototype.findAddonByName = function(name) {
  this.initializeAddons();

  var exactMatch = find(this.addons, function(addon) {
    return name === addon.name || (addon.pkg && name === addon.pkg.name);
  });

  if (exactMatch) {
    return exactMatch;
  }

  return find(this.addons, function(addon) {
    return name.indexOf(addon.name) > -1 || (addon.pkg && name.indexOf(addon.pkg.name) > -1);
  });
};

/**
  Generate test file contents.

  This method is supposed to be overwritten by test framework addons
  like `ember-cli-qunit` and `ember-cli-mocha`.

  @public
  @method generateTestFile
  @param {String} moduleName Name of the test module (e.g. `JSHint`)
  @param {Object[]} tests Array of tests with `name`, `passed` and `errorMessage` properties
  @return {String} The test file content
 */
Project.prototype.generateTestFile = function(/* moduleName, tests */) {
  var message = 'Please install an Ember.js test framework addon or update your dependencies.';

  if (this.ui) {
    this.ui.writeDeprecateLine(message)
  } else {
    console.warn(message);
  }

  return '';
};

/**
  Returns a new project based on the first package.json that is found
  in `pathName`.

  @private
  @static
  @method closest
  @param  {String} pathName Path to your project
  @return {Promise}         Promise which resolves to a {Project}
 */
Project.closest = function(pathName, _ui, _cli) {
  var ui = ensureUI(_ui);
  return closestPackageJSON(pathName)
    .then(function(result) {
      debug('closest %s -> %s', pathName, result);
      if (result.pkg && result.pkg.name === 'ember-cli') {
        return Project.nullProject(_ui, _cli);
      }

      return new Project(result.directory, result.pkg, ui, _cli);
    })
    .catch(function(reason) {
      handleFindupError(pathName);
    });
};

/**
  Returns a new project based on the first package.json that is found
  in `pathName`.

  @private
  @static
  @method closestSync
  @param  {String} pathName Path to your project
  @param  {UI} _ui The UI instance to provide to the created Project.
  @return {Project}         Project instance
 */
Project.closestSync = function(pathName, _ui, _cli) {
  var ui = ensureUI(_ui);
  var directory, pkg;

  if (_cli && _cli.testing) {
    directory = existsSync(path.join(pathName, 'package.json')) && process.cwd();
    if (!directory) {
      if (pathName.indexOf(path.sep + 'app') > -1) {
        directory = findupPath(pathName);
      } else {
        pkg = {name: 'ember-cli'};
      }
    }
  } else {
    directory = findupPath(pathName);
  }
  if (!pkg) {
    pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json')));
  }

  debug('dir' + directory);
  debug('pkg: %s', pkg);
  if (pkg && pkg.name === 'ember-cli') {
    return Project.nullProject(_ui, _cli);
  }

  debug('closestSync %s -> %s', pathName, directory);
  return new Project(directory, pkg, ui, _cli);
};

/**
  Returns a new project based on the first package.json that is found
  in `pathName`, or the nullProject.

  The nullProject signifies no-project, but abides by the null object pattern

  @private
  @static
  @method projectOrnullProject
  @param  {UI} _ui The UI instance to provide to the created Project.
  @return {Project}         Project instance
 */
Project.projectOrnullProject = function(_ui, _cli) {
  try {
    return Project.closestSync(process.cwd(), _ui, _cli);
  } catch (reason) {
    if (reason instanceof Project.NotFoundError) {
      return Project.nullProject(_ui, _cli);
    } else {
      throw reason;
    }
  }
};

/**
  Returns the project root based on the first package.json that is found

  @return {String} The project root directory
 */
Project.getProjectRoot = function () {
  try {
    var directory = path.dirname(findUp(process.cwd(), 'package.json'));
    var pkg = require(path.join(directory, 'package.json'));

    if (pkg && pkg.name === 'ember-cli') {
      debug('getProjectRoot: named \'ember-cli\'. Will use cwd: %s', process.cwd());
      return process.cwd();
    }

    debug('getProjectRoot %s -> %s', process.cwd(), directory);
    return directory;
  } catch (reason) {
    debug('getProjectRoot: not found. Will use cwd: %s', process.cwd());
    return process.cwd();
  }
};

function NotFoundError(message) {
  this.name = 'NotFoundError';
  this.message = message;
  this.stack = (new Error()).stack;
}

NotFoundError.prototype = Object.create(Error.prototype);
NotFoundError.prototype.constructor = NotFoundError;

Project.NotFoundError = NotFoundError;

function ensureUI(_ui) {
  var ui = _ui;

  if (!ui) {
    // TODO: one UI (lib/cli/index.js also has one for now...)
    ui = new UI({
      inputStream:  process.stdin,
      outputStream: process.stdout,
      ci:           process.env.CI || /^(dumb|emacs)$/.test(process.env.TERM),
      writeLevel:   ~process.argv.indexOf('--silent') ? 'ERROR' : undefined
    });
  }

  return ui;
}

function closestPackageJSON(pathName) {
  return Promise.resolve()
    .then(() => findUp('package.json', pathName))
    .then(filePath => ({
      directory: path.dirname(filePath),
      pkg: require(filePath)
    }));
}

function findupPath(pathName) {
  try {
    return path.dirname(findUp('package.json', pathName));
  } catch (reason) {
    handleFindupError(pathName);
  }
}

function handleFindupError(pathName) {
  throw new NotFoundError('No project found at or up from: `' + pathName + '`');
}

// Export
module.exports = Project;
