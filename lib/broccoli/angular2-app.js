'use strict';
const path = require('path');
const fs = require('fs');

const BroccoliPlugin = require('broccoli-writer');
const BroccoliTypescript = require('./broccoli-typescript');
const BundlePlugin = require('./angular-broccoli-bundle');
const BroccoliFunnel = require('broccoli-funnel');
const BroccoliMergeTrees = require('broccoli-merge-trees');
const BroccoliSource = require('broccoli-source');
const UnwatchedDir = BroccoliSource.UnwatchedDir;
const Project = require('ember-cli/lib/models/project');
const HandlebarReplace = require('./broccoli-handlebars');
const config = require('../../addon/ng2/models/config');
const loadEnvironment = require('./environment');
const concat = require('broccoli-concat');
const uglify = require('broccoli-uglify-js');

class Angular2App extends BroccoliPlugin {
  constructor(project, inputNode, options) {
    super();
    this.ngConfig = config.CliConfig.fromProject();

    if (!options) {
      options = inputNode;
      inputNode = null;
    }

    options = options || {};

    this._options = options;
    this._sourceDir = options.sourceDir
                   || (this.ngConfig.defaults && this.ngConfig.defaults.sourceDir)
                   || 'src';
    this._options.polyfills = this._options.polyfills || [
      'vendor/es6-shim/es6-shim.js',
      'vendor/reflect-metadata/Reflect.js',
      'vendor/systemjs/dist/system.src.js',
      'vendor/zone.js/dist/zone.js'
    ];

    this._destDir = options.destDir || '';

    // By default, add all spec files to the tsCompiler.
    this._tsCompiler = options.tsCompiler || {
      additionalFiles: ['**/*.spec.ts']
    };

    this._initProject();
    this._notifyAddonIncluded();
    this._inputNode = inputNode || this._buildInputTree();

    this._tree = this._buildTree();
  }

  /**
   * For compatibility with Ember addons
   * @returns {*|{}}
   */
  get options(){
    return this._options;
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

    if (fs.existsSync('icons')) {
      inputTreeArray.push(new BroccoliFunnel('icons', { destDir: 'icons' }));
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

    if (this.ngConfig.apps[0].mobile) {
      let AppShellPlugin = require('angular2-broccoli-prerender').AppShellPlugin;
      merged = new BroccoliMergeTrees([merged, new AppShellPlugin(merged, 'index.html', 'main-app-shell')], {
        overwrite: true
      });
    }

    if (loadEnvironment(this.project).production) {
      merged = this._getBundleTree(merged);
    }

    return new BroccoliFunnel(merged, {
      destDir: this._destDir,
      overwrite: true
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
    var mobile;

    let indexTree = new BroccoliFunnel(this._inputNode, {
      include: files.map(name => path.join(this._sourceDir, name)),
      getDestinationPath: (n) => {
        if (n.startsWith(this._sourceDir)) {
          return n.substr(this._sourceDir.length);
        }
        return n;
      }
    });

    if (this.ngConfig.apps[0].mobile) {
      mobile = {
        icons: [
          { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
          { rel: 'apple-touch-icon', sizes: '57x57', href: '/icons/apple-touch-icon-57x57.png' },
          { rel: 'apple-touch-icon', sizes: '60x60', href: '/icons/apple-touch-icon-60x60.png' },
          { rel: 'apple-touch-icon', sizes: '72x72', href: '/icons/apple-touch-icon-72x72.png' },
          { rel: 'apple-touch-icon', sizes: '76x76', href: '/icons/apple-touch-icon-76x76.png' },
          { rel: 'apple-touch-icon', sizes: '114x114', href: '/icons/apple-touch-icon-114x114.png' },
          { rel: 'apple-touch-icon', sizes: '120x120', href: '/icons/apple-touch-icon-120x120.png' },
          { rel: 'apple-touch-icon', sizes: '144x144', href: '/icons/apple-touch-icon-144x144.png' },
          { rel: 'apple-touch-icon', sizes: '152x152', href: '/icons/apple-touch-icon-152x152.png' },
          { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon-180x180.png' },
          { rel: 'apple-touch-startup-image', href: '/icons/apple-touch-icon-180x180.png' }
        ]
      }
    }

    return new HandlebarReplace(indexTree, {
      config: this.ngConfig,
      environment: loadEnvironment(this.project),
      scripts: {
        polyfills: this._options.polyfills
      },
      mobile: mobile
    }, {
      helpers: {
        'content-for': (name) => {
          // TODO: remove content-for.
          // eslint-disable-next-line no-console
          console.warn('"{{content-for}}" has been deprecated and will be removed before RC.');
          return this._contentFor(null, name);
        }
      }
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

    if (loadEnvironment(this.project).production) {
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

    if (this.ngConfig.apps[0].mobile) {
      vendorNpmFiles.push('@angular/service-worker/dist/worker.js')
    }

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
        '**/*.styl',
        '**/tsconfig.json'
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
    let env = process.env['EMBER_ENV'] || 'dev';

    switch (env) {
    case 'production': env = 'prod'; break;
    case 'development': env = 'dev'; break;
    }

    var envConfigFile = `environment.${env}.ts`;

    return new BroccoliFunnel('config', {
      include: [envConfigFile],
      destDir: `${this._sourceDir}/app`,
      getDestinationPath: () => 'environment.ts'
    });
  }

  _getBundleTree(preBundleTree){
    var vendorTree = this._getVendorNpmTree();
    var assetsTree = this._getAssetsTree();

    var scriptTree = new BroccoliFunnel(preBundleTree, {
      include: this._options.polyfills
    });

    var nonJsTree = new BroccoliFunnel(preBundleTree, {
      exclude: ['**/*.js', '**/*.js.map']
    });
    var jsTree = new BroccoliFunnel(preBundleTree, {
      include: ['**/*.js', '**/*.js.map']
    });

    var bundleTree = new BundlePlugin([jsTree]);

    if (this.ngConfig.apps[0].mobile) {
      bundleTree = concat(BroccoliMergeTrees([vendorTree, jsTree, scriptTree, bundleTree], {
        overwrite: true
      }), {
        headerFiles: this._options.polyfills.concat([
          'system-config.js',
          'main.js',
          'app/index.js'
        ]),
        inputFiles: [
          'system-import.js'
        ],
        header: ';(function() {',
        footer: '}());',
        sourceMapConfig: { enabled: true },
        allowNone: false,
        outputFile: '/app-concat.js'
      });

      bundleTree = uglify(bundleTree, {
        mangle: false
      });

      // Required here since the package isn't installed for non-mobile apps.
      var ServiceWorkerPlugin = require('@angular/service-worker').ServiceWorkerPlugin;
      // worker.js is needed so it can be copied to dist
      var workerJsTree = new BroccoliFunnel(jsTree, {
        include: ['vendor/@angular/service-worker/dist/worker.js']
      });
      /**
       * ServiceWorkerPlugin will automatically pre-fetch and cache every file
       * in the tree it receives, so it should only receive the app bundle,
       * and non-JS static files from the app. The plugin also needs to have
       * the worker.js file available so it can copy it to dist.
       **/
      var swTree = new ServiceWorkerPlugin(BroccoliMergeTrees([
        bundleTree,
        assetsTree,
        workerJsTree
      ]));
      bundleTree = BroccoliMergeTrees([bundleTree, swTree], {
        overwrite: true
      });
    }

    return BroccoliMergeTrees([nonJsTree, scriptTree, bundleTree], { overwrite: true });
  }
}

module.exports = Angular2App;
