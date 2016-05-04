'use strict';
const path = require('path');
const fs = require('fs');

const isProduction = require('./is-production');
const BroccoliPlugin = require('broccoli-writer');
const BroccoliConfigReplace = require('./broccoli-config-replace');
const BroccoliTypescript = require('./broccoli-typescript');
const BundlePlugin = require('./angular-broccoli-bundle');
const BroccoliFunnel = require('broccoli-funnel');
const BroccoliMergeTrees = require('broccoli-merge-trees');
const BroccoliSource = require('broccoli-source');
const UnwatchedDir = BroccoliSource.UnwatchedDir;
const Project = require('ember-cli/lib/models/project');
const config = require('../../addon/ng2/models/config');

class Angular2App extends BroccoliPlugin {
  constructor(project, inputNode, options) {
    const ngConfig = config.CliConfig.fromProject();

    if (!options) {
      options = inputNode;
      inputNode = null;
    }

    super();
    options = options || {};

    this._options = options;
    this._sourceDir = ngConfig.defaults.sourceDir || 'src';
    this._inputNode = inputNode || this._buildInputTree();
    this._destDir = options.destDir || '';

    // By default, add all spec files to the tsCompiler.
    this._tsCompiler = options.tsCompiler || {
      additionalFiles: ['**/*.spec.ts']
    };

    this._initProject();
    this._notifyAddonIncluded();

    this._tree = this._buildTree();
  }

  /**
   * For backward compatibility.
   * @public
   * @method toTree
   * @return {BroccoliPlugin} A broccoli plugin.
   */
  toTree() {
    // eslint-disable-next-line no-console
    console.warn('Angular2App is now a broccoli plugin. Calling toTree() is deprecated.');
    return this;
  }

  /**
   * @override
   */
  read(readTree) {
    return this._tree.read(readTree);
  }

  /**
   * @override
   */
  cleanup() {
    return this._tree.cleanup();
  }

  _buildInputTree() {
    const inputTreeArray = [
      new BroccoliFunnel(this._sourceDir, { destDir: this._sourceDir }),
      new BroccoliFunnel('typings', { destDir: 'typings' }),
      this._getConfigTree()
    ];

    if (fs.existsSync('public')) {
      inputTreeArray.push(new BroccoliFunnel('public', { destDir: 'public' }));
    }

    return new BroccoliMergeTrees(inputTreeArray, { overwrite: true });
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
   * @private
   * @method _buildTree
   * @return {BroccoliFunnel} The app trees that can be used to extend the build.
   */
  _buildTree() {
    var assetTree = this._getAssetsTree();
    var tsTree = this._getTsTree();
    var indexTree = this._getIndexTree();
    var vendorNpmTree = this._getVendorNpmTree();

    var buildTrees = [assetTree, tsTree, indexTree, vendorNpmTree];

    // Add available and supported CSS plugins.
    for (const suffix of ['sass', 'less', 'stylus', 'compass']) {
      const plugin = require(`./angular-broccoli-${suffix}`);
      const tree = plugin.makeBroccoliTree(this._inputNode, this._options[`${suffix}Compiler`]);

      if (!tree) {
        continue;
      }

      buildTrees.push(new BroccoliFunnel(tree, {
        include: ['**/*'],
        getDestinationPath: (n) => {
          if (n.startsWith(this._sourceDir)) {
            return n.substr(this._sourceDir.length);
          }
          return n;
        }
      }));
    }

    // Add the public folder in.
    buildTrees.push(new BroccoliFunnel(this._inputNode, {
      allowEmpty: true,
      srcDir: 'public',
      name: 'PublicFolderFunnel'
    }));

    var merged = new BroccoliMergeTrees(buildTrees, { overwrite: true });

    if (isProduction) {
      merged = this._getBundleTree(merged);
    }

    return new BroccoliFunnel(merged, {
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
    var files = [
      'index.html'
    ];

    let indexTree = new BroccoliFunnel(this._inputNode, {
      include: files.map(name => path.join(this._sourceDir, name)),
      getDestinationPath: (n) => {
        if (n.startsWith(this._sourceDir)) {
          return n.substr(this._sourceDir.length);
        }
        return n;
      }
    });

    return BroccoliConfigReplace(indexTree, {
      files: files,
      patterns: this._getReplacePatterns()
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
    var tsConfigPath = path.join(this._sourceDir, 'tsconfig.json');
    var tsTree = new BroccoliTypescript(this._inputNode, tsConfigPath, this._tsCompiler);

    var tsTreeExcludes = ['*.d.ts', 'tsconfig.json'];
    var excludeSpecFiles = '**/*.spec.*';

    if (isProduction) {
      tsTreeExcludes.push(excludeSpecFiles);
    }

    tsTree = new BroccoliFunnel(tsTree, {
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
    ];

    if (this._options.vendorNpmFiles) {
      vendorNpmFiles = vendorNpmFiles.concat(this._options.vendorNpmFiles);
    }

    return new BroccoliFunnel(new UnwatchedDir('node_modules'), {
      include: vendorNpmFiles,
      destDir: 'vendor',
      name: 'vendor'
    });
  }

  /**
   * Returns the `assets` tree.
   *
   * @private
   * @method _getAssetsTree
   * @return {Tree} The assets tree.
   */
  _getAssetsTree() {
    return new BroccoliFunnel(this._inputNode, {
      srcDir: this._sourceDir,
      exclude: [
        '**/*.ts',
        '**/*.scss',
        '**/*.sass',
        '**/*.less',
        '**/*.styl'
      ],
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

    return new BroccoliFunnel('config', {
      include: [envConfigFile],
      destDir: `${this._sourceDir}/app`,
      getDestinationPath: () => 'environment.ts'
    });
  }

  _getBundleTree(preBundleTree){
    var indexFile = path.join(this._sourceDir, 'index.html');
    var indexContent = fs.readFileSync(indexFile, 'utf8');
    var scriptTagVendorFiles = indexContent.match(/vendor\/[^"']*\.js/gi);

    var scriptTree = new BroccoliFunnel(preBundleTree, {
      include: scriptTagVendorFiles
    });

    var nonJsTree = new BroccoliFunnel(preBundleTree, {
      exclude: ['**/*.js', '**/*.js.map']
    });
    var jsTree = new BroccoliFunnel(preBundleTree, {
      include: ['**/*.js']
    });

    return BroccoliMergeTrees([nonJsTree, scriptTree, new BundlePlugin([jsTree])], { overwrite: true });
  }
}

module.exports = Angular2App;
