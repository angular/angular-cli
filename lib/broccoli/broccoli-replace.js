"use strict";
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var diffing_broccoli_plugin_1 = require('./diffing-broccoli-plugin');
var minimatch = require('minimatch');
var FILE_ENCODING = { encoding: 'utf-8' };
/**
 * Intercepts each changed file and replaces its contents with
 * the associated changes.
 */
var DiffingReplace = (function () {
    function DiffingReplace(inputPath, cachePath, options) {
        this.inputPath = inputPath;
        this.cachePath = cachePath;
        this.options = options;
    }
    DiffingReplace.prototype.rebuild = function (treeDiff) {
        var _this = this;
        var patterns = this.options.patterns;
        var files = this.options.files;
        treeDiff.addedPaths.concat(treeDiff.changedPaths)
            .forEach(function (changedFilePath) {
            var sourceFilePath = path.join(_this.inputPath, changedFilePath);
            var destFilePath = path.join(_this.cachePath, changedFilePath);
            var destDirPath = path.dirname(destFilePath);
            if (!fs.existsSync(destDirPath)) {
                fse.mkdirpSync(destDirPath);
            }
            var fileMatches = files.some(function (filePath) { return minimatch(changedFilePath, filePath); });
            if (fileMatches) {
                var content = fs.readFileSync(sourceFilePath, FILE_ENCODING);
                patterns.forEach(function (pattern) {
                    var replacement = pattern.replacement;
                    if (typeof replacement === 'function') {
                        replacement = function (content) {
                            return pattern.replacement(content, changedFilePath);
                        };
                    }
                    content = content.replace(pattern.match, replacement);
                });
                fs.writeFileSync(destFilePath, content, FILE_ENCODING);
            }
            else if (!fs.existsSync(destFilePath)) {
                try {
                    fs.symlinkSync(sourceFilePath, destFilePath);
                }
                catch (e) {
                    fs.writeFileSync(destFilePath, fs.readFileSync(sourceFilePath));
                }
            }
        });
        treeDiff.removedPaths.forEach(function (removedFilePath) {
            var destFilePath = path.join(_this.cachePath, removedFilePath);
            fs.unlinkSync(destFilePath);
        });
    };
    return DiffingReplace;
}());
exports.__esModule = true;
exports["default"] = diffing_broccoli_plugin_1.wrapDiffingPlugin(DiffingReplace);
//# sourceMappingURL=broccoli-replace.js.map