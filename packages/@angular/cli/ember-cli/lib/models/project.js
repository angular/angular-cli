'use strict';

/**
@module ember-cli
*/
const denodeify = require('denodeify');
const path = require('path');
const findUp = require('../../../utilities/find-up').findUp;
let resolve = denodeify(require('resolve'));
const fs = require('fs-extra');
const _ = require('lodash');
const nodeModulesPath = require('node-modules-path');

let processCwd = process.cwd();
// ensure NULL_PROJECT is a singleton
let NULL_PROJECT;

class Project {
  /**
    The Project model is tied to your package.json. It is instantiated
    by giving {{#crossLink "Project/closestSync:method"}}{{/crossLink}}
    the path to your project.
    @class Project
    @constructor
    @param {String} root Root directory for the project
    @param {Object} pkg  Contents of package.json
    @param {UI} ui
    @param {CLI} cli
  */
  constructor(root, pkg, ui, cli) {
    this.root = root;
    this.pkg = pkg;
    this.ui = ui;
    this.cli = cli;
    this.addonPackages = {};
    this.addons = [];
    this.liveReloadFilterPatterns = [];
    this.setupNodeModulesPath();

    /**
      Set when the `Watcher.detectWatchman` helper method finishes running,
      so that other areas of the system can be aware that watchman is being used.
      For example, this information is used in the broccoli build pipeline to know
      if we can watch additional directories (like bower_components) "cheaply".
      Contains `enabled` and `version`.
      @private
      @property _watchmanInfo
      @return {Object}
      @default false
    */
    this._watchmanInfo = {
      enabled: false,
      version: null,
      canNestRoots: false,
    };

    let instrumentation = this._instrumentation = ensureInstrumentation(cli, ui);
    if (instrumentation) {
      instrumentation.project = this;
    }
  }

  hasDependencies() {
    return !!this.nodeModulesPath;
  }

  /**
    Sets the path to the node_modules directory for this
    project.
    @private
    @method setupNodeModulesPath
   */
  setupNodeModulesPath() {
    this.nodeModulesPath = nodeModulesPath(this.root);
  }

  static nullProject(ui, cli) {
    if (NULL_PROJECT) { return NULL_PROJECT; }

    NULL_PROJECT = new Project(processCwd, {}, ui, cli);

    NULL_PROJECT.isEmberCLIProject = function() {
      return false;
    };

    NULL_PROJECT.name = function() {
      return path.basename(process.cwd());
    };

    return NULL_PROJECT;
  }

  /**
    Returns the name from package.json.
    @private
    @method name
    @return {String} Package name
   */
  name() {
    const getPackageBaseName = require('../utilities/get-package-base-name');

    return getPackageBaseName(this.pkg.name);
  }

  /**
    Returns whether or not this is an Ember CLI project.
    This checks whether ember-cli is listed in devDependencies.
    @private
    @method isEmberCLIProject
    @return {Boolean} Whether this is an Ember CLI project
   */
  isEmberCLIProject() {
    return 'angular-cli' in this.dependencies()
        || '@angular/cli' in this.dependencies();
  }

  /**
    Loads the configuration for this project and its addons.
    @public
    @method config
    @param  {String} env Environment name
    @return {Object}     Merged confiration object
   */
  config(env) {
    let initialConfig = {};

    return this.addons.reduce((config, addon) => {
      if (addon.config) {
        _.merge(config, addon.config(env, config));
      }

      return config;
    }, initialConfig);
  }

  /**
    Returns whether or not the given file name is present in this project.
    @private
    @method has
    @param  {String}  file File name
    @return {Boolean}      Whether or not the file is present
   */
  has(file) {
    return fs.existsSync(path.join(this.root, file)) || fs.existsSync(path.join(this.root, `${file}.js`));
  }

  /**
    Resolves the absolute path to a file.
    @private
    @method resolve
    @param  {String} file File to resolve
    @return {String}      Absolute path to file
   */
  resolve(file) {
    return resolve(file, {
      basedir: this.root,
    });
  }

  /**
    Resolves the absolute path to a file synchronously
    @private
    @method resolveSync
    @param  {String} file File to resolve
    @return {String}      Absolute path to file
   */
  resolveSync(file) {
    return resolve.sync(file, {
      basedir: this.root,
    });
  }

  /**
    Calls `require` on a given module from the context of the project. For
    instance, an addon may want to require a class from the root project's
    version of ember-cli.
    @public
    @method require
    @param  {String} file File path or module name
    @return {Object}      Imported module
   */
  require(file) {
    if (/^\.\//.test(file)) { // Starts with ./
      return require(path.join(this.root, file));
    } else if (file.slice(0, this.root.length) === this.root) { // Starts with this.root
      return require(file);
    } else {
      return require(path.join(this.nodeModulesPath, file));
    }
  }

  /**
    Returns the dependencies from a package.json
    @private
    @method dependencies
    @param  {Object} [pkg=this.pkg] Package object
    @param  {Boolean} [excludeDevDeps=false] Whether or not development dependencies should be excluded
    @return {Object} Dependencies
   */
  dependencies(pkg, excludeDevDeps) {
    pkg = pkg || this.pkg || {};

    let devDependencies = pkg['devDependencies'];
    if (excludeDevDeps) {
      devDependencies = {};
    }

    return _.assign({}, devDependencies, pkg['dependencies']);
  }

  /**
    Reloads package.json
    @private
    @method reloadPkg
    @return {Object} Package content
   */
  reloadPkg() {
    let pkgPath = path.join(this.root, 'package.json');

    // We use readFileSync instead of require to avoid the require cache.
    this.pkg = fs.readJsonSync(pkgPath);

    return this.pkg;
  }

  /**
    Returns a new project based on the first package.json that is found
    in `pathName`.
    @deprecated
    @private
    @static
    @method closest
    @param  {String} pathName Path to your project
    @return {Promise}         Promise which resolves to a {Project}
   */
  static closest(pathName, _ui, _cli) {
    let ui = ensureUI(_ui);

    ui.writeDeprecateLine('`Project.closest` is a private method that will be removed, please use `Project.closestSync` instead.');

    return closestPackageJSON(pathName).then(result => {
      if (result.pkg && result.pkg.name === 'ember-cli') {
        return Project.nullProject(_ui, _cli);
      }

      return new Project(result.directory, result.pkg, ui, _cli);
    });
  }

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
  static closestSync(pathName, _ui, _cli) {
    let ui = ensureUI(_ui);

    let directory = findupPath(pathName);

    let relative = path.relative(directory, pathName);
    if (relative.indexOf('tmp') === 0) {
      return Project.nullProject(_ui, _cli);
    }

    let pkg = fs.readJsonSync(path.join(directory, 'package.json'));

    if (!isEmberCliProject(pkg)) {
      return Project.nullProject(_ui, _cli);
    }

    return new Project(directory, pkg, ui, _cli);
  }

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
  static projectOrnullProject(_ui, _cli) {
    try {
      return Project.closestSync(process.cwd(), _ui, _cli);
    } catch (reason) {
      if (reason instanceof Project.NotFoundError) {
        return Project.nullProject(_ui, _cli);
      } else {
        throw reason;
      }
    }
  }

  /**
    Returns the project root based on the first package.json that is found
    @static
    @method getProjectRoot
    @return {String} The project root directory
   */
  static getProjectRoot() {
    let packagePath = findUp(process.cwd(), 'package.json');
    if (!packagePath) {
      return process.cwd();
    }

    let directory = path.dirname(packagePath);
    const pkg = require(packagePath);

    if (pkg && pkg.name === 'ember-cli') {
      return process.cwd();
    }

    return directory;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.stack = (new Error()).stack;
  }
}

Project.NotFoundError = NotFoundError;

function ensureInstrumentation(cli, ui) {
  if (cli && cli.instrumentation) {
    return cli.instrumentation;
  }

  return null;
}

function ensureUI(_ui) {
  let ui = _ui;

  if (!ui) {
    // TODO: one UI (lib/cli/index.js also has one for now...)
    const UI = require('../ui');
    ui = new UI({
      inputStream: process.stdin,
      outputStream: process.stdout,
      ci: process.env.CI || (/^(dumb|emacs)$/).test(process.env.TERM),
      writeLevel: (process.argv.indexOf('--silent') !== -1) ? 'ERROR' : undefined,
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
    throw new NotFoundError(`No project found at or up from: \`${pathName}\``);
  }
}

function isEmberCliProject(pkg) {
  return pkg && (
    (pkg.dependencies && Object.keys(pkg.dependencies).indexOf('@angular/cli') !== -1) ||
    (pkg.devDependencies && Object.keys(pkg.devDependencies).indexOf('@angular/cli') !== -1)
  );
}

// Export
module.exports = Project;
