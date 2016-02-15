/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/fs-extra/fs-extra.d.ts" />
"use strict";
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var diffing_broccoli_plugin_1 = require('./diffing-broccoli-plugin');
/**
 * Intercepts each file as it is copied to the destination tempdir,
 * and tees a copy to the given path outside the tmp dir.
 */
var DestCopy = (function () {
    function DestCopy(inputPath, cachePath, outputRoot) {
        this.inputPath = inputPath;
        this.cachePath = cachePath;
        this.outputRoot = outputRoot;
    }
    DestCopy.prototype.rebuild = function (treeDiff) {
        var _this = this;
        treeDiff.addedPaths.concat(treeDiff.changedPaths)
            .forEach(function (changedFilePath) {
            var destFilePath = path.join(_this.outputRoot, changedFilePath);
            var destDirPath = path.dirname(destFilePath);
            fse.mkdirsSync(destDirPath);
            fse.copySync(path.join(_this.inputPath, changedFilePath), destFilePath);
        });
        treeDiff.removedPaths.forEach(function (removedFilePath) {
            var destFilePath = path.join(_this.outputRoot, removedFilePath);
            // TODO: what about obsolete directories? we are not cleaning those up yet
            fs.unlinkSync(destFilePath);
        });
    };
    return DestCopy;
}());
exports.__esModule = true;
exports["default"] = diffing_broccoli_plugin_1.wrapDiffingPlugin(DestCopy);
//# sourceMappingURL=broccoli-dest-copy.js.map