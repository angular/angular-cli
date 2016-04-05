var path = require('path');
var isProduction = require('./is-production');
var configReplace = require('./broccoli-config-replace');
var compileWithTypescript = require('./broccoli-typescript');
var SwManifest = require('./service-worker-manifest').default;
var fs = require('fs');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var uglify = require('broccoli-uglify-js');
var Project = require('ember-cli/lib/models/project');
var sourceDir = 'src/client';

module.exports = Angular2App;

function Angular2App(defaults, options) {
  this._initProject();
  this._notifyAddonIncluded();
  this.options = options || {};
}

/**
 * Create and return the app build system tree that:
 * - Get the `assets` tree
 * - Get the TS tree
 * - Get the TS src tree
 * - Get the index.html tree
 * - Get the NPM modules tree
 * - Apply/remove stuff based on the environment (dev|prod)
 * - Return the app trees to be extended
 *
 * @public
 * @method toTree
 * @return {Array<Tree>} The app trees that can be used to extend the build.
 */
Angular2App.prototype.toTree = function () {
  var assetTree = this._getAssetsTree();
  var tsTree = this._getTsTree();
  var indexTree = this._getIndexTree();
  var vendorNpmTree = this._getVendorNpmTree();
  var excludeDotfilesTree = this._getPublicTree();

  var buildTrees = [assetTree, tsTree, indexTree, vendorNpmTree];

  if (fs.existsSync('public')) {
    buildTrees.push(excludeDotfilesTree);
  }

  buildTrees = buildTrees.concat(
    require('./angular-broccoli-sass').makeBroccoliTree(sourceDir),
    require('./angular-broccoli-less').makeBroccoliTree(sourceDir),
    require('./angular-broccoli-stylus').makeBroccoliTree(sourceDir),
    require('./angular-broccoli-compass').makeBroccoliTree(sourceDir)
  ).filter(x => !!x);

  var merged = mergeTrees(buildTrees, { overwrite: true });

  return mergeTrees([merged, new SwManifest([merged])]);
};


/**
 * @private
 * @method _initProject
 * @param {Object} options
 */
Angular2App.prototype._initProject = function () {
  this.project = Project.closestSync(process.cwd());

  // project root dir env used on angular-cli side for including packages from project
  process.env.PROJECT_ROOT = process.env.PROJECT_ROOT || this.project.root;
};

/**
 * @private
 * @method _notifyAddonIncluded
 */
Angular2App.prototype._notifyAddonIncluded = function () {
  this.initializeAddons();
  this.project.addons = this.project.addons.filter(function (addon) {
    addon.app = this;

    if (!addon.isEnabled || addon.isEnabled()) {
      if (addon.included) {
        addon.included(this);
      }

      return addon;
    }
  }, this);
};


/**
 * Loads and initializes addons for this project.
 * Calls initializeAddons on the Project.
 *
 * @private
 * @method initializeAddons
 */
Angular2App.prototype.initializeAddons = function () {
  this.project.initializeAddons();
};


/**
 * Returns the content for a specific type (section) for index.html.
 *
 * Currently supported types:
 * - 'head'
 * //- 'config-module'
 * //- 'app'
 * //- 'head-footer'
 * //- 'test-header-footer'
 * //- 'body-footer'
 * //- 'test-body-footer'
 *
 * Addons can also implement this method and could also define additional
 * types (eg. 'some-addon-section').
 *
 * @private
 * @method _contentFor
 * @param  {RegExP} match  Regular expression to match against
 * @param  {String} type   Type of content
 * @return {String}        The content.
 */
Angular2App.prototype._contentFor = function (match, type) {
  var content = [];

  /*switch (type) {
   case 'head':          this._contentForHead(content, config);         break;
   case 'config-module': this._contentForConfigModule(content, config); break;
   case 'app-boot':      this._contentForAppBoot(content, config);      break;
   }*/

  content = this.project.addons.reduce(function (content, addon) {
    var addonContent = addon.contentFor ? addon.contentFor(type) : null;
    if (addonContent) {
      return content.concat(addonContent);
    }

    return content;
  }, content);


  return content.join('\n');
};


/**
 * @private
 * @method _getReplacePatterns
 * @return Array<Pattern> Replace patterns.
 */
Angular2App.prototype._getReplacePatterns = function () {
  return [{
    match: /\{\{content-for ['"](.+)["']\}\}/g,
    replacement: isProduction ? '' : this._contentFor.bind(this)
  }];
};


/**
 * Returns the tree for app/index.html.
 *
 * @private
 * @method _getIndexTree
 * @return {Tree} Tree for app/index.html.
 */
Angular2App.prototype._getIndexTree = function () {
  var htmlName = 'index.html';
  var files = [
    'index.html'
  ];

  var index = new Funnel('src/client', {
    files: files,
    description: 'Funnel: index.html'
  });


  return configReplace(index, {
    files: [htmlName],
    patterns: this._getReplacePatterns()
  });
};


/**
 * Returns the source root dir tree.
 *
 * @private
 * @method _getSourceTree
 * @return {Tree} Tree for the src dir.
 */
Angular2App.prototype._getSourceTree = function () {
  return new Funnel('src/client', {
    include: ['*.ts', '**/*.ts', '**/*.d.ts'],
    destDir: 'src/client'
  });
};


/**
 * Returns the typings tree.
 *
 * @private
 * @method _getTypingsTree
 * @return {Tree} Tree for the src dir.
 */
Angular2App.prototype._getTypingsTree = function () {
  return new Funnel('typings', {
    include: ['browser.d.ts', 'browser/**'],
    destDir: 'typings'
  });
};


/**
 * Returns the TS tree.
 *
 * @private
 * @method _getTsTree
 * @return {Tree} Tree for TypeScript files.
 */
Angular2App.prototype._getTsTree = function () {
  var typingsTree = this._getTypingsTree();
  var sourceTree = this._getSourceTree();

  var tsconfig = JSON.parse(fs.readFileSync('src/client/tsconfig.json', 'utf-8'));
  // Add all spec files to files. We need this because spec files are their own entry
  // point.
  fs.readdirSync(sourceDir).forEach(function addPathRecursive(name) {
    const filePath = path.join(sourceDir, name);
    if (filePath.match(/\.spec\.[jt]s$/)) {
      tsconfig.files.push(name);
    } else if (fs.statSync(filePath).isDirectory()) {
      // Recursively call this function with the full sub-path.
      fs.readdirSync(filePath).forEach(function (n) {
        addPathRecursive(path.join(name, n));
      });
    }
  });

  // Because the tsconfig does not include the source directory, add this as the first path
  // element.
  tsconfig.files = tsconfig.files.map(name => path.join(sourceDir, name));

  var srcAndTypingsTree = mergeTrees([sourceTree, typingsTree]);
  var tsTree = new compileWithTypescript(srcAndTypingsTree, tsconfig);

  var tsTreeExcludes = ['*.d.ts', 'tsconfig.json'];
  var excludeSpecFiles = '**/*.spec.*';

  if (isProduction) {
    tsTreeExcludes.push(excludeSpecFiles);
    tsTree = uglify(tsTree);
  }

  tsTree = new Funnel(tsTree, {
    srcDir: 'src/client',
    exclude: tsTreeExcludes
  });

  return tsTree;
};


/**
 * Returns the `vendorNpm` tree by merging the CLI dependencies plus the ones
 * passed by the user.
 *
 * @private
 * @method _getVendorNpmTree
 * @return {Tree} The NPM tree.
 */
Angular2App.prototype._getVendorNpmTree = function () {
  var vendorNpmFiles = [
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

  if (this.options.vendorNpmFiles) {
    vendorNpmFiles = vendorNpmFiles.concat(this.options.vendorNpmFiles);
  }

  var vendorNpmTree = new Funnel('node_modules', {
    include: vendorNpmFiles,
    destDir: 'vendor'
  });

  return vendorNpmTree;
};


/**
 * Returns the `assets` tree.
 *
 * @private
 * @method _getAssetsTree
 * @return {Tree} The assets tree.
 */
Angular2App.prototype._getAssetsTree = function () {
  return new Funnel(sourceDir, {
    include: ['**/*.*'],
    exclude: [
      '**/*.ts', 
      '**/*.js', 
      '**/*.scss', 
      '**/*.sass', 
      '**/*.less',
      '**/*.styl'
    ],
    allowEmpty: true
  });
};

/**
 * Returns the `excludeDotfiles` tree.
 *
 * @private
 * @method _getPublicTree
 * @return {Tree} The dotfiles exclusion tree.
 */
Angular2App.prototype._getPublicTree = function () {
  return new Funnel('public', {
    exclude: ['**/.*'],
    allowEmpty: true
  });
};
