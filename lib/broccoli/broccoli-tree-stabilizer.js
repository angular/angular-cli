/// <reference path="broccoli.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
"use strict";
var fs = require('fs');
var symlinkOrCopy = require('symlink-or-copy');
/**
 * Stabilizes the inputPath for the following plugins in the build tree.
 *
 * All broccoli plugins that inherit from `broccoli-writer` or `broccoli-filter` change their
 * outputPath during each rebuild.
 *
 * This means that all following plugins in the build tree can't rely on their inputPath being
 * immutable. This results in breakage of any plugin that is not expecting such behavior.
 *
 * For example all `DiffingBroccoliPlugin`s expect their inputPath to be stable.
 *
 * By inserting this plugin into the tree after any misbehaving plugin, we can stabilize the
 * inputPath for the following plugin in the tree and correct the surprising behavior.
 */
var TreeStabilizer = (function () {
    function TreeStabilizer(inputTree) {
        this.inputTree = inputTree;
    }
    TreeStabilizer.prototype.rebuild = function () {
        fs.rmdirSync(this.outputPath);
        // TODO: investigate if we can use rename the directory instead to improve performance on
        // Windows
        symlinkOrCopy.sync(this.inputPath, this.outputPath);
    };
    TreeStabilizer.prototype.cleanup = function () { };
    return TreeStabilizer;
}());
function stabilizeTree(inputTree) {
    return new TreeStabilizer(inputTree);
}
exports.__esModule = true;
exports["default"] = stabilizeTree;
//# sourceMappingURL=broccoli-tree-stabilizer.js.map