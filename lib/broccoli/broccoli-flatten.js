"use strict";
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var diffing_broccoli_plugin_1 = require('./diffing-broccoli-plugin');
var symlinkOrCopy = require('symlink-or-copy').sync;
var isWindows = process.platform === 'win32';
/**
 * Intercepts each changed file and replaces its contents with
 * the associated changes.
 */
var DiffingFlatten = (function () {
    function DiffingFlatten(inputPath, cachePath, options) {
        this.inputPath = inputPath;
        this.cachePath = cachePath;
        this.options = options;
    }
    DiffingFlatten.prototype.rebuild = function (treeDiff) {
        var _this = this;
        var pathsToUpdate = treeDiff.addedPaths;
        // since we need to run on Windows as well we can't rely on symlinks being available,
        // which means that we need to respond to both added and changed paths
        if (isWindows) {
            pathsToUpdate = pathsToUpdate.concat(treeDiff.changedPaths);
        }
        pathsToUpdate.forEach(function (changedFilePath) {
            var sourceFilePath = path.join(_this.inputPath, changedFilePath);
            var destFilePath = path.join(_this.cachePath, path.basename(changedFilePath));
            var destDirPath = path.dirname(destFilePath);
            if (!fs.existsSync(destDirPath)) {
                fse.mkdirpSync(destDirPath);
            }
            if (!fs.existsSync(destFilePath)) {
                symlinkOrCopy(sourceFilePath, destFilePath);
            }
            else {
                throw new Error(("Duplicate file '" + path.basename(changedFilePath) + "' ") +
                    ("found in path '" + changedFilePath + "'"));
            }
        });
        treeDiff.removedPaths.forEach(function (removedFilePath) {
            var destFilePath = path.join(_this.cachePath, path.basename(removedFilePath));
            fs.unlinkSync(destFilePath);
        });
    };
    return DiffingFlatten;
}());
exports.DiffingFlatten = DiffingFlatten;
exports.__esModule = true;
exports["default"] = diffing_broccoli_plugin_1.wrapDiffingPlugin(DiffingFlatten);
//# sourceMappingURL=broccoli-flatten.js.map