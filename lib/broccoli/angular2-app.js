'use strict';
const path = require('path');
const isProduction = require('./is-production');
const configReplace = require('./broccoli-config-replace');
const compileWithTypescript = require('./broccoli-typescript');
const SwManifest = require('./service-worker-manifest').default;
const fs = require('fs');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const uglify = require('broccoli-uglify-js');
const Project = require('ember-cli/lib/models/project');
const glob = require('glob');


class Angular2App {
  constructor(defaults, options) {
    options = options || {};

    this._options = options;
    this._sourceDir = options.sourceDir || 'src/client';
    this._destDir = options.destDir || '';

    // By default, add all spec files to the tsCompiler.
    this._tsCompiler = options.tsCompiler || {
      additionalFiles: ['**/*.spec.ts']
    };

    this._initProject();
    this._notifyAddonIncluded();
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
  toTree() {
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
        require('./angular-broccoli-sass').makeBroccoliTree(this._sourceDir,
                                                            this._options.sassCompiler),
        require('./angular-broccoli-less').makeBroccoliTree(this._sourceDir,
                                                            this._options.lessCompiler),
        require('./angular-broccoli-stylus').makeBroccoliTree(this._sourceDir,
                                                              this._options.stylusCompiler),
        require('./angular-broccoli-compass').makeBroccoliTree(this._sourceDir,
                                                               this._options.compassCompiler)
      ).filter(x => !!x);

    var merged = mergeTrees(buildTrees, { overwrite: true });
    return new Funnel(mergeTrees([merged, new SwManifest([merged])]), {
      destDir: this._destDir
    });
  }


  /**
   * @private
   * @method _initProject
   * @param {Object} options
   */
  _initProject() {
    this.project = Project.closestSync(process.cwd());

    // project root dir env used on angular-cli side for including packages from project
    process.env.PROJECT_ROOT = process.env.PROJECT_ROOT || this.project.root;
  }

  /**
   * @private
   * @method _notifyAddonIncluded
   */
  _notifyAddonIncluded() {
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
  }

  /**
   * Loads and initializes addons for this project.
   * Calls initializeAddons on the Project.
   *
   * @private
   * @method initializeAddons
   */
  initializeAddons() {
    this.project.initializeAddons();
  }

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
  _contentFor(match, type) {
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
  }

  /**
   * @private
   * @method _getReplacePatterns
   * @return Array<Pattern> Replace patterns.
   */
  _getReplacePatterns() {
    return [{
      match: /\{\{content-for ['"](.+)["']\}\}/g,
      replacement: isProduction ? '' : this._contentFor.bind(this)
    }];
  }

  /**
   * Returns the tree for app/index.html.
   *
   * @private
   * @method _getIndexTree
   * @return {Tree} Tree for app/index.html.
   */
  _getIndexTree() {
    var htmlName = 'index.html';
    var files = [
      'index.html'
    ];

    var index = new Funnel(this._sourceDir, {
      files: files,
      description: 'Funnel: index.html'
    });


    return configReplace(index, {
      files: [htmlName],
      patterns: this._getReplacePatterns()
    });
  }

  /**
   * Returns the source root dir tree.
   *
   * @private
   * @method _getSourceTree
   * @return {Tree} Tree for the src dir.
   */
  _getSourceTree() {
    return new Funnel(this._sourceDir, {
      include: ['*.ts', '**/*.ts', '**/*.d.ts'],
      destDir: this._sourceDir
    });
  }

  /**
   * Returns the typings tree.
   *
   * @private
   * @method _getTypingsTree
   * @return {Tree} Tree for the src dir.
   */
  _getTypingsTree() {
    return new Funnel('typings', {
      include: ['browser.d.ts', 'browser/**'],
      destDir: 'typings'
    });
  }

  /**
   * Returns the TS tree.
   *
   * @private
   * @method _getTsTree
   * @return {Tree} Tree for TypeScript files.
   */
  _getTsTree() {
    var typingsTree = this._getTypingsTree();
    var sourceTree = this._getSourceTree();
    var configTree = this._getConfigTree();

    var tsConfigPath = path.join(this._sourceDir, 'tsconfig.json');
    var tsconfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));

    // Add all glob files to files. In some cases we don't want to specify
    let globFiles = this._tsCompiler.additionalFiles;
    if (globFiles) {
      if (typeof globFiles == 'string') {
        globFiles = [globFiles];
      }

      for (const g of globFiles) {
        const files = glob(g, { sync: true, cwd: this._sourceDir, root: this._sourceDir });
        tsconfig.files = tsconfig.files.concat(files);
      }
    }

    // Remove dupes in tsconfig.files.
    const fileNameMap = {};
    tsconfig.files = tsconfig.files.filter(fileName => {
      if (fileNameMap[fileName]) {
        return false;
      }
      fileNameMap[fileName] = true;
      return true;
    });

    // Because the tsconfig does not include the source directory, add this as the first path
    // element.
    tsconfig.files = tsconfig.files.map(name => path.join(this._sourceDir, name));

    var mergedTree = mergeTrees([sourceTree, typingsTree, configTree], { overwrite: true });
    var tsTree = new compileWithTypescript(mergedTree, tsconfig);

    var tsTreeExcludes = ['*.d.ts', 'tsconfig.json'];
    var excludeSpecFiles = '**/*.spec.*';

    if (isProduction) {
      tsTreeExcludes.push(excludeSpecFiles);
      tsTree = uglify(tsTree);
    }

    tsTree = new Funnel(tsTree, {
      srcDir: this._sourceDir,
      exclude: tsTreeExcludes
    });

    return tsTree;
  }


  /**
   * Returns the `vendorNpm` tree by merging the CLI dependencies plus the ones
   * passed by the user.
   *
   * @private
   * @method _getVendorNpmTree
   * @return {Tree} The NPM tree.
   */
  _getVendorNpmTree() {
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

    if (this._options.vendorNpmFiles) {
      vendorNpmFiles = vendorNpmFiles.concat(this._options.vendorNpmFiles);
    }

    var vendorNpmTree = new Funnel('node_modules', {
      include: vendorNpmFiles,
      destDir: 'vendor'
    });

    return vendorNpmTree;
  }

  /**
   * Returns the `assets` tree.
   *
   * @private
   * @method _getAssetsTree
   * @return {Tree} The assets tree.
   */
  _getAssetsTree() {
    return new Funnel(this._sourceDir, {
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
  }

  /**
   * Returns the `excludeDotfiles` tree.
   *
   * @private
   * @method _getPublicTree
   * @return {Tree} The dotfiles exclusion tree.
   */
  _getPublicTree() {
    return new Funnel('public', {
      exclude: ['**/.*'],
      allowEmpty: true
    });
  }

  /**
   * Returns the config files tree.
   *
   * @private
   * @method _getConfigTree
   * @return {Tree} The config files tree.
   */
  _getConfigTree() {
    var envConfigFile = isProduction ? 'environment.prod.ts' : 'environment.dev.ts';
    // console.log(envConfigFile);
    return new Funnel('config', {
      include: [envConfigFile],
      destDir: 'src/client/app',
      getDestinationPath: () => 'environment.ts'
    });
  }
}

module.exports = Angular2App;
