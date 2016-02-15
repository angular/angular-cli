/// <reference path="broccoli.d.ts" />
/// <reference path="../typings/fs-extra/fs-extra.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
"use strict";
var fs = require('fs');
var tree_differ_1 = require('./tree-differ');
var broccoli_tree_stabilizer_1 = require('./broccoli-tree-stabilizer');
var symlinkOrCopy = require('symlink-or-copy');
var tree_differ_2 = require('./tree-differ');
exports.DiffResult = tree_differ_2.DiffResult;
/**
 * Makes writing diffing plugins easy.
 *
 * Factory method that takes a class that implements the DiffingBroccoliPlugin interface and returns
 * an instance of BroccoliTree.
 *
 * @param pluginClass
 * @returns {DiffingBroccoliPlugin}
 */
function wrapDiffingPlugin(pluginClass) {
    return function () { return new DiffingPluginWrapper(pluginClass, arguments); };
}
exports.wrapDiffingPlugin = wrapDiffingPlugin;
var DiffingPluginWrapper = (function () {
    function DiffingPluginWrapper(pluginClass, wrappedPluginArguments) {
        this.pluginClass = pluginClass;
        this.wrappedPluginArguments = wrappedPluginArguments;
        this.treeDiffer = null;
        this.treeDiffers = null;
        this.initialized = false;
        this.wrappedPlugin = null;
        this.inputTree = null;
        this.inputTrees = null;
        this.description = null;
        // props monkey-patched by broccoli builder:
        this.inputPath = null;
        this.inputPaths = null;
        this.cachePath = null;
        this.outputPath = null;
        this.diffResult = null;
        if (Array.isArray(wrappedPluginArguments[0])) {
            this.inputTrees = this.stabilizeTrees(wrappedPluginArguments[0]);
        }
        else {
            this.inputTree = this.stabilizeTree(wrappedPluginArguments[0]);
        }
        this.description = this.pluginClass.name;
    }
    DiffingPluginWrapper.prototype.getDiffResult = function () {
        var _this = this;
        var returnOrCalculateDiffResult = function (tree, index) {
            // returnOrCalculateDiffResult will do one of two things:
            //
            // If `this.diffResult` is null, calculate a DiffResult using TreeDiffer
            // for the input tree.
            //
            // Otherwise, `this.diffResult` was produced from the output of the
            // inputTree's rebuild() method, and can be used without being checked.
            // Set `this.diffResult` to null and return the previously stored value.
            var diffResult = tree.diffResult;
            if (diffResult)
                return diffResult;
            var differ = index === false ? _this.treeDiffer : _this.treeDiffers[index];
            return differ.diffTree();
        };
        if (this.inputTrees) {
            return this.inputTrees.map(returnOrCalculateDiffResult);
        }
        else if (this.inputTree) {
            return returnOrCalculateDiffResult(this.inputTree, false);
        }
        else {
            throw new Error("Missing TreeDiffer");
        }
    };
    DiffingPluginWrapper.prototype.maybeStoreDiffResult = function (value) {
        if (!(value instanceof tree_differ_1.DiffResult))
            value = null;
        this.diffResult = (value);
    };
    DiffingPluginWrapper.prototype.rebuild = function () {
        var _this = this;
        try {
            var firstRun = !this.initialized;
            this.init();
            var diffResult = this.getDiffResult();
            var result = this.wrappedPlugin.rebuild(diffResult);
            if (result) {
                var resultPromise = (result);
                if (resultPromise.then) {
                    // rebuild() -> Promise<>
                    return resultPromise.then(function (result) {
                        _this.maybeStoreDiffResult(result);
                        _this.relinkOutputAndCachePaths();
                    });
                }
            }
            this.maybeStoreDiffResult((result));
            this.relinkOutputAndCachePaths();
        }
        catch (e) {
            e.message = "[" + this.description + "]: " + e.message;
            throw e;
        }
    };
    DiffingPluginWrapper.prototype.cleanup = function () {
        if (this.wrappedPlugin && this.wrappedPlugin.cleanup) {
            this.wrappedPlugin.cleanup();
        }
    };
    DiffingPluginWrapper.prototype.relinkOutputAndCachePaths = function () {
        // just symlink the cache and output tree
        fs.rmdirSync(this.outputPath);
        symlinkOrCopy.sync(this.cachePath, this.outputPath);
    };
    DiffingPluginWrapper.prototype.init = function () {
        if (!this.initialized) {
            var includeExtensions_1 = this.pluginClass.includeExtensions || [];
            var excludeExtensions_1 = this.pluginClass.excludeExtensions || [];
            var description_1 = this.description;
            this.initialized = true;
            if (this.inputPaths) {
                this.treeDiffers =
                    this.inputPaths.map(function (inputPath) { return new tree_differ_1.TreeDiffer(description_1, inputPath, includeExtensions_1, excludeExtensions_1); });
            }
            else if (this.inputPath) {
                this.treeDiffer =
                    new tree_differ_1.TreeDiffer(description_1, this.inputPath, includeExtensions_1, excludeExtensions_1);
            }
            this.wrappedPlugin = new this.pluginClass(this.inputPaths || this.inputPath, this.cachePath, this.wrappedPluginArguments[1]);
        }
    };
    DiffingPluginWrapper.prototype.stabilizeTrees = function (trees) {
        // Prevent extensions to prevent array from being mutated from the outside.
        // For-loop used to avoid re-allocating a new array.
        var stableTrees = [];
        for (var i = 0; i < trees.length; ++i) {
            // ignore null/undefined input tries in order to support conditional build pipelines
            if (trees[i]) {
                stableTrees.push(this.stabilizeTree(trees[i]));
            }
        }
        if (stableTrees.length === 0) {
            throw new Error('No input trees provided!');
        }
        return Object.freeze(stableTrees);
    };
    DiffingPluginWrapper.prototype.stabilizeTree = function (tree) {
        // Ignore all DiffingPlugins as they are already stable, for others we don't know for sure
        // so we need to stabilize them.
        // Since it's not safe to use instanceof operator in node, we are checking the constructor.name.
        //
        // New-style/rebuild trees should always be stable.
        var isNewStyleTree = !!(tree['newStyleTree'] || typeof tree.rebuild === 'function' ||
            tree['isReadAPICompatTree'] || tree.constructor['name'] === 'Funnel');
        return isNewStyleTree ? tree : broccoli_tree_stabilizer_1["default"](tree);
    };
    return DiffingPluginWrapper;
}());
//# sourceMappingURL=diffing-broccoli-plugin.js.map