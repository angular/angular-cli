"use strict";
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var symlinkOrCopySync = require('symlink-or-copy').sync;
var diffing_broccoli_plugin_1 = require('./diffing-broccoli-plugin');
var isWindows = process.platform === 'win32';
function outputFileSync(sourcePath, destPath) {
    var dirname = path.dirname(destPath);
    fse.mkdirsSync(dirname, { fs: fs });
    symlinkOrCopySync(sourcePath, destPath);
}
function pathOverwrittenError(path) {
    var msg = 'Either remove the duplicate or enable the "overwrite" option for this merge.';
    return new Error("Duplicate path found while merging trees. Path: \"" + path + "\".\n" + msg);
}
var MergeTrees = (function () {
    function MergeTrees(inputPaths, cachePath, options) {
        if (options === void 0) { options = {}; }
        this.inputPaths = inputPaths;
        this.cachePath = cachePath;
        this.pathCache = Object.create(null);
        this.firstBuild = true;
        this.options = options || {};
    }
    MergeTrees.prototype.rebuild = function (treeDiffs) {
        var _this = this;
        var overwrite = this.options.overwrite;
        var pathsToEmit = [];
        var pathsToRemove = [];
        var emitted = Object.create(null);
        var contains = function (cache, val) {
            for (var i = 0, ii = cache.length; i < ii; ++i) {
                if (cache[i] === val)
                    return true;
            }
            return false;
        };
        var emit = function (relativePath) {
            // ASSERT(!emitted[relativePath]);
            pathsToEmit.push(relativePath);
            emitted[relativePath] = true;
        };
        if (this.firstBuild) {
            this.firstBuild = false;
            // Build initial cache
            treeDiffs.reverse().forEach(function (treeDiff, index) {
                index = treeDiffs.length - 1 - index;
                treeDiff.addedPaths.forEach(function (changedPath) {
                    var cache = _this.pathCache[changedPath];
                    if (cache === undefined) {
                        _this.pathCache[changedPath] = [index];
                        pathsToEmit.push(changedPath);
                    }
                    else if (overwrite) {
                        // ASSERT(contains(pathsToEmit, changedPath));
                        cache.unshift(index);
                    }
                    else {
                        throw pathOverwrittenError(changedPath);
                    }
                });
            });
        }
        else {
            // Update cache
            treeDiffs.reverse().forEach(function (treeDiff, index) {
                index = treeDiffs.length - 1 - index;
                if (treeDiff.removedPaths) {
                    treeDiff.removedPaths.forEach(function (removedPath) {
                        var cache = _this.pathCache[removedPath];
                        // ASSERT(cache !== undefined);
                        // ASSERT(contains(cache, index));
                        if (cache[cache.length - 1] === index) {
                            pathsToRemove.push(path.join(_this.cachePath, removedPath));
                            cache.pop();
                            if (cache.length === 0) {
                                _this.pathCache[removedPath] = undefined;
                            }
                            else if (!emitted[removedPath]) {
                                if (cache.length === 1 && !overwrite) {
                                    throw pathOverwrittenError(removedPath);
                                }
                                emit(removedPath);
                            }
                        }
                    });
                }
                var pathsToUpdate = treeDiff.addedPaths;
                if (isWindows) {
                    pathsToUpdate = pathsToUpdate.concat(treeDiff.changedPaths);
                }
                pathsToUpdate.forEach(function (changedPath) {
                    var cache = _this.pathCache[changedPath];
                    if (cache === undefined) {
                        // File was added
                        _this.pathCache[changedPath] = [index];
                        emit(changedPath);
                    }
                    else if (!contains(cache, index)) {
                        cache.push(index);
                        cache.sort(function (a, b) { return a - b; });
                        if (cache.length > 1 && !overwrite) {
                            throw pathOverwrittenError(changedPath);
                        }
                        if (cache[cache.length - 1] === index && !emitted[changedPath]) {
                            emit(changedPath);
                        }
                    }
                });
            });
        }
        pathsToRemove.forEach(function (destPath) { return fse.removeSync(destPath); });
        pathsToEmit.forEach(function (emittedPath) {
            var cache = _this.pathCache[emittedPath];
            var destPath = path.join(_this.cachePath, emittedPath);
            var sourceIndex = cache[cache.length - 1];
            var sourceInputPath = _this.inputPaths[sourceIndex];
            var sourcePath = path.join(sourceInputPath, emittedPath);
            if (cache.length > 1) {
                fse.removeSync(destPath);
            }
            outputFileSync(sourcePath, destPath);
        });
    };
    return MergeTrees;
}());
exports.MergeTrees = MergeTrees;
exports.__esModule = true;
exports["default"] = diffing_broccoli_plugin_1.wrapDiffingPlugin(MergeTrees);
//# sourceMappingURL=broccoli-merge-trees.js.map