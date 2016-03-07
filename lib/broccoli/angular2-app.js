var path = require('path');
var Concat = require('broccoli-concat');
var configReplace = require('./broccoli-config-replace');
var compileWithTypescript = require('./broccoli-typescript').default;
var SwManifest = require('./service-worker-manifest').default;
var fs = require('fs');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var Project = require('ember-cli/lib/models/project');

module.exports = Angular2App;

function Angular2App(defaults, options, additionalPaths) {
    this._initProject();
    this._notifyAddonIncluded();
    this.options = options;
    this.additionalPaths = additionalPaths || [];
}

Angular2App.prototype.toTree = function() {
    var sourceTree = 'src';
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

    if (this.options && this.options.vendorNpmFiles) {
      vendorNpmFiles = vendorNpmFiles.concat(this.options.vendorNpmFiles);
    }

    var tsConfigCompilerOptions = JSON.parse(fs.readFileSync('src/tsconfig.json', 'utf-8')).compilerOptions;
    tsConfigCompilerOptions.rootFilePaths = ['typings.d.ts'].concat(this.additionalPaths)
      .map(function(name) {
        return path.join(process.cwd(), sourceTree, name)
      });

    var tsTree = compileWithTypescript(sourceTree, tsConfigCompilerOptions);
    var tsSrcTree = new Funnel(sourceTree, {
      include: ['**/*.ts'],
      allowEmpty: true
    });

    var jsTree = new Funnel(sourceTree, {
        include: ['**/*.js'],
        allowEmpty: true
    });

    var assetTree = new Funnel(sourceTree, {
        include: ['**/*.*'],
        exclude: ['**/*.ts', '**/*.js'],
        allowEmpty: true
    });

    var vendorNpmTree = new Funnel('node_modules', {
      include: vendorNpmFiles,
      destDir: 'vendor'
    });

    var thirdPartyJsTree = new Funnel('node_modules', {
      include: ['ng2*/bundles/*.js'],
      exclude: ['ng2*/bundles/*.min.js', 'ng2*/bundles/*.standalone.js'],
    });

    var thirdPartyJs = new Concat(thirdPartyJsTree, {
      inputFiles: ['**/*.js'],
      outputFile: '/thirdparty/libs.js',
      allowNone: true
    });

    var merged = mergeTrees([
      assetTree,
      tsSrcTree,
      tsTree,
      jsTree,
      this.index(),
      vendorNpmTree,
      thirdPartyJs
    ], { overwrite: true });

    return mergeTrees([merged, new SwManifest(merged)]);
};

/**
 @private
 @method _initProject
 @param {Object} options
 */
Angular2App.prototype._initProject = function() {
    this.project = Project.closestSync(process.cwd());

    /*if (options.configPath) {
        this.project.configPath = function() { return options.configPath; };
    }*/
};

/**
 @private
 @method _notifyAddonIncluded
 */
Angular2App.prototype._notifyAddonIncluded = function() {
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

/**
 Loads and initializes addons for this project.
 Calls initializeAddons on the Project.

 @private
 @method initializeAddons
 */
Angular2App.prototype.initializeAddons = function() {
    this.project.initializeAddons();
};

/**
 Returns the content for a specific type (section) for index.html.

 Currently supported types:
 - 'head'
 //- 'config-module'
 //- 'app'
 //- 'head-footer'
 //- 'test-header-footer'
 //- 'body-footer'
 //- 'test-body-footer'

 Addons can also implement this method and could also define additional
 types (eg. 'some-addon-section').

 @private
 @method contentFor
 @param  {RegExP} match  Regular expression to match against
 @param  {String} type   Type of content
 @return {String}        The content.
 */
Angular2App.prototype.contentFor = function(match, type) {
    var content = [];

    /*switch (type) {
        case 'head':          this._contentForHead(content, config);         break;
        case 'config-module': this._contentForConfigModule(content, config); break;
        case 'app-boot':      this._contentForAppBoot(content, config);      break;
    }*/

    content = this.project.addons.reduce(function(content, addon) {
        var addonContent = addon.contentFor ? addon.contentFor(type) : null;
        if (addonContent) {
            return content.concat(addonContent);
        }

        return content;
    }, content);


    return content.join('\n');
};

/**
 @private
 @method _configReplacePatterns
 @return
 */
Angular2App.prototype._configReplacePatterns = function() {
    return [/*{
        match: /\{\{EMBER_ENV\}\}/g,
        replacement: calculateEmberENV
    }, */{
        match: /\{\{content-for ['"](.+)["']\}\}/g,
        replacement: this.contentFor.bind(this)
    }/*, {
        match: /\{\{MODULE_PREFIX\}\}/g,
        replacement: calculateModulePrefix
    }*/];
};


/**
 Returns the tree for app/index.html

 @private
 @method index
 @return {Tree} Tree for app/index.html
 */
Angular2App.prototype.index = function() {
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
