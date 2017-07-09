'use strict';

let logger = require('heimdalljs-logger')('ember-cli:installation-checker');
const fs = require('fs-extra');
const path = require('path');
const SilentError = require('silent-error');

class InstallationChecker {
  constructor(options) {
    this.project = options.project;
  }

  /**
  * Check if npm and bower installation directories are present,
  * and raise an error message with instructions on how to proceed.
  *
  * If some of these package managers aren't being used in the project
  * we just ignore them. Their usage is considered by checking the
  * presence of your manifest files: package.json for npm and bower.json for bower.
  *
  * @method checkInstallations
  */
  checkInstallations() {
    let commands = [];

    if (this.usingNpm() && this.npmDependenciesNotPresent()) {
      logger.info('npm dependencies not installed');
      commands.push('`npm install`');
    }
    if (this.usingBower() && this.bowerDependenciesNotPresent()) {
      logger.info('bower dependencies not installed');
      commands.push('`bower install`');
    }
    if (commands.length) {
      let commandText = commands.join(' and ');
      throw new SilentError(`No dependencies installed. Run ${commandText} to install missing dependencies.`);
    }
  }

  hasBowerDeps() {
    return hasDependencies(readJSON(path.join(this.project.root, 'bower.json')));
  }

  usingBower() {
    return fs.existsSync(path.join(this.project.root, 'bower.json')) && this.hasBowerDeps();
  }

  bowerDependenciesNotPresent() {
    return !fs.existsSync(this.project.bowerDirectory);
  }

  hasNpmDeps() {
    return hasDependencies(readJSON(path.join(this.project.root, 'package.json')));
  }

  usingNpm() {
    return fs.existsSync(path.join(this.project.root, 'package.json')) && this.hasNpmDeps();
  }

  npmDependenciesNotPresent() {
    return !fs.existsSync(this.project.nodeModulesPath);
  }
}

module.exports = InstallationChecker;

function hasDependencies(pkg) {
  return (pkg.dependencies && pkg.dependencies.length) ||
         (pkg.devDependencies && pkg.devDependencies.length);
}

function readJSON(path) {
  try {
    return fs.readJsonSync(path);
  } catch (e) {
    throw new SilentError(`InstallationChecker: Unable to parse: ${path}`);
  }
}
