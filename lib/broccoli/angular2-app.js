var Concat = require('broccoli-concat');
var configReplace = require('./broccoli-config-replace');
var compileWithTypescript = require('./broccoli-typescript').default;
var fs = require('fs');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var Project = require('ember-cli/lib//models/project');

module.exports = Angular2App;

function Angular2App(defaults, options) {
    this._initProject();
    this._notifyAddonIncluded();
}

Angular2App.prototype.toTree = function () {

    var trees = [];

    // tsTree
    var sourceTree = 'src';
    var tsConfigCompilerOptions = JSON.parse(fs.readFileSync('src/tsconfig.json', 'utf-8')).compilerOptions;
    trees.push(compileWithTypescript(sourceTree, tsConfigCompilerOptions));

    // tsSrcTree
    trees.push( new Funnel(sourceTree, {
      include: ['**/*.ts'],
      allowEmpty: true
    }));

    // jsTree
    trees.push( new Funnel(sourceTree, {
        include: ['**/*.js'],
        allowEmpty: true
    }));

    // assetTree
    trees.push( new Funnel(sourceTree, {
        include: ['**/*.*'],
        exclude: ['**/*.ts', '**/*.js', 'src/tsconfig.json'],
        allowEmpty: true
    }));

    // external trees (from cli-config.json) - Enables users to add trees
    var extConfig = JSON.parse(fs.readFileSync('cli-config.json', 'utf-8'));
    if( extConfig && extConfig.funnels ) {
        extConfig.funnels.forEach( (funnel)=> {
            trees.push( new Funnel( funnel.from, {files: funnel.files, destDir: funnel.to}));
        });
    }

    // index - moved last so it doesn't get overwritten by another funnel
    trees.push(this.index());

    // var appJs = new Concat(mergeTrees([tsTree, jsTree]), {
    //     inputFiles: [
    //         '*.js',
    //         '**/*.js'
    //     ],
    //     outputFile: '/app.js'
    // });

    return mergeTrees(trees, { overwrite: true });
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
