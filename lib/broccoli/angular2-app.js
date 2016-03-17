/* jshint node: true, esnext: true */
'use strict';

const path          = require('path');
const Funnel        = require('broccoli-funnel');
const mergeTrees    = require('broccoli-merge-trees');
const ts            = require('./broccoli-typescript');
const sass          = require('./broccoli-sass');
const less          = require('./broccoli-less');
const configReplace = require('./broccoli-config-replace');
const SWManifest    = require('./service-worker-manifest');
const Project       = require('ember-cli/lib/models/project');
const sh            = require('shelljs');

module.exports = Ng2App;

function Ng2App(defaults, options, additionalPaths) {
  this._initProject();
  this._notifyAddonIncluded();
  this.options = options;
  this.additionalPaths = additionalPaths || [];
}

Ng2App.prototype.toTree = function() {
  const src = 'src';

  let tsCompilerOptions = require(path.resolve(process.cwd(), 'src/tsconfig.json')).compilerOptions;
  const tsNodeTree = new ts([src], tsCompilerOptions);

  const vendorNpmFiles = [
    'systemjs/dist/system-polyfills.js',
    'systemjs/dist/system.src.js',
    'es6-shim/es6-shim.js',
    'angular2/bundles/angular2-polyfills.js',
    'rxjs/bundles/Rx.js',
    'angular2/bundles/angular2.dev.js',
    'angular2/bundles/http.dev.js',
    'angular2/bundles/router.dev.js',
    'angular2/bundles/upgrade.dev.js'
  ];

  const vendorNpmTree = new Funnel('node_modules', {
    include: vendorNpmFiles,
    destDir: 'vendor'
  });

  const jsTree = new Funnel(src, {
    include: ['**/*.js'],
    allowEmpty: true
  });

  const assetTree = new Funnel(src, {
    include: ['**/*.*'],
    exclude: ['**/*.ts', '**/*.js', '**/*.scss', '**/*.sass', '**/*.less'],
    allowEmpty: true
  });

  let trees = [vendorNpmTree, assetTree, tsNodeTree, jsTree, this.index()];

  trees.push(new SWManifest([src]));

  return mergeTrees(trees, { overwrite: true });
};

Ng2App.prototype._initProject = function() {
  this.project = Project.closestSync(process.cwd());
};

Ng2App.prototype._notifyAddonIncluded = function() {
  this.initializeAddons();
  this.project.addons = this.project.addons.filter(function(addon) {
    addon.app = this;

    if (!addon.isEnabled || addon.isEnabled()) {
      if (addon.included) {
        addon.included(this);
      }

      return addon;
    }
  }, this);
};

Ng2App.prototype.initializeAddons = function() {
  this.project.initializeAddons();
};

Ng2App.prototype.contentFor = function(match, type) {
    var content = [];

    content = this.project.addons.reduce(function(content, addon) {
      var addonContent = addon.contentFor ? addon.contentFor(type) : null;
      if (addonContent) {
        return content.concat(addonContent);
      }

      return content;
    }, content);

    return content.join('\n');
};

Ng2App.prototype._configReplacePatterns = function() {
  return [{
    match: /\{\{content-for ['"](.+)["']\}\}/g,
    replacement: this.contentFor.bind(this)
  }];
};

Ng2App.prototype.index = function() {
  var htmlName = 'index.html';
  var files = [
    'index.html'
  ];

  var index = new Funnel('src', {
    files: files,
    description: 'Funnel: index.html'
  });

  return configReplace(index, {
    files: [ htmlName ],
    patterns: this._configReplacePatterns()
  });
};
