var fs = require('fs');
var tree_differ_1 = require('./tree-differ');
var symlinkOrCopy = require('symlink-or-copy');
/**
 * Makes writing diffing plugins easy.
 *
 * Factory method that takes a class that implements the DiffingBroccoliPlugin interface and returns
 * an instance of BroccoliTree.
 *
 * @param pluginClass
 * @returns {DiffingPlugin}
 */
function wrapDiffingPlugin(pluginClass) {
    return function () { return new DiffingPluginWrapper(pluginClass, arguments); };
}
exports.wrapDiffingPlugin = wrapDiffingPlugin;
var DiffingPluginWrapper = (function () {
    function DiffingPluginWrapper(pluginClass, wrappedPluginArguments) {
        this.pluginClass = pluginClass;
        this.wrappedPluginArguments = wrappedPluginArguments;
        this.initialized = false;
        this.wrappedPlugin = null;
        this.inputTree = null;
        this.inputTrees = null;
        this.description = null;
        // props monkey-patched by broccoli builder:
        this.inputPath = null;
        this.cachePath = null;
        this.outputPath = null;
        if (Array.isArray(wrappedPluginArguments[0])) {
            this.inputTrees = wrappedPluginArguments[0];
        }
        else {
            this.inputTree = wrappedPluginArguments[0];
        }
        this.description = this.pluginClass.name;
    }
    DiffingPluginWrapper.prototype.rebuild = function () {
        try {
            var firstRun = !this.initialized;
            this.init();
            var diffResult = this.treeDiffer.diffTree();
            diffResult.log(!firstRun);
            var rebuildPromise = this.wrappedPlugin.rebuild(diffResult);
            if (rebuildPromise) {
                return rebuildPromise.then(this.relinkOutputAndCachePaths.bind(this));
            }
            this.relinkOutputAndCachePaths();
        }
        catch (e) {
            e.message = "[" + this.description + "]: " + e.message;
            throw e;
        }
    };
    DiffingPluginWrapper.prototype.relinkOutputAndCachePaths = function () {
        // just symlink the cache and output tree
        fs.rmdirSync(this.outputPath);
        symlinkOrCopy.sync(this.cachePath, this.outputPath);
    };
    DiffingPluginWrapper.prototype.init = function () {
        if (!this.initialized) {
            var includeExtensions = this.pluginClass.includeExtensions || [];
            var excludeExtensions = this.pluginClass.excludeExtensions || [];
            this.initialized = true;
            this.treeDiffer = new tree_differ_1.TreeDiffer(this.inputPath, includeExtensions, excludeExtensions);
            this.wrappedPlugin =
                new this.pluginClass(this.inputPath, this.cachePath, this.wrappedPluginArguments[1]);
        }
    };
    DiffingPluginWrapper.prototype.cleanup = function () {
        if (this.wrappedPlugin.cleanup) {
            this.wrappedPlugin.cleanup();
        }
    };
    return DiffingPluginWrapper;
})();
