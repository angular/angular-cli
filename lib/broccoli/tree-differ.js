/// <reference path="../typings/node/node.d.ts" />
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fs = require('fs');
var path = require('path');
function tryStatSync(path) {
    try {
        return fs.statSync(path);
    }
    catch (e) {
        if (e.code === "ENOENT")
            return null;
        throw e;
    }
}
var TreeDiffer = (function () {
    function TreeDiffer(label, rootPath, includeExtensions, excludeExtensions) {
        this.label = label;
        this.rootPath = rootPath;
        this.fingerprints = Object.create(null);
        this.nextFingerprints = Object.create(null);
        this.include = null;
        this.exclude = null;
        this.rootDirName = path.basename(rootPath);
        var buildRegexp = function (arr) { return new RegExp("(" + arr.reduce(combine, "") + ")$", "i"); };
        this.include = (includeExtensions || []).length ? buildRegexp(includeExtensions) : null;
        this.exclude = (excludeExtensions || []).length ? buildRegexp(excludeExtensions) : null;
        function combine(prev, curr) {
            if (curr.charAt(0) !== ".") {
                throw new Error("Extension must begin with '.'. Was: '" + curr + "'");
            }
            var kSpecialRegexpChars = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
            curr = '(' + curr.replace(kSpecialRegexpChars, '\\$&') + ')';
            return prev ? (prev + '|' + curr) : curr;
        }
    }
    TreeDiffer.prototype.diffTree = function () {
        var result = new DirtyCheckingDiffResult(this.label, this.rootDirName);
        this.dirtyCheckPath(this.rootPath, result);
        this.detectDeletionsAndUpdateFingerprints(result);
        result.endTime = Date.now();
        return result;
    };
    TreeDiffer.prototype.dirtyCheckPath = function (rootDir, result) {
        var _this = this;
        fs.readdirSync(rootDir).forEach(function (segment) {
            var absolutePath = path.join(rootDir, segment);
            var pathStat = fs.lstatSync(absolutePath);
            if (pathStat.isSymbolicLink()) {
                pathStat = tryStatSync(absolutePath);
                if (pathStat === null)
                    return;
            }
            if (pathStat.isDirectory()) {
                result.directoriesChecked++;
                _this.dirtyCheckPath(absolutePath, result);
            }
            else {
                if (!(_this.include && !absolutePath.match(_this.include)) &&
                    !(_this.exclude && absolutePath.match(_this.exclude))) {
                    result.filesChecked++;
                    var relativeFilePath = path.relative(_this.rootPath, absolutePath);
                    switch (_this.isFileDirty(absolutePath, pathStat)) {
                        case FileStatus.Added:
                            result.addedPaths.push(relativeFilePath);
                            break;
                        case FileStatus.Changed:
                            result.changedPaths.push(relativeFilePath);
                    }
                }
            }
        });
        return result;
    };
    TreeDiffer.prototype.isFileDirty = function (path, stat) {
        var oldFingerprint = this.fingerprints[path];
        var newFingerprint = stat.mtime.getTime() + " # " + stat.size;
        this.nextFingerprints[path] = newFingerprint;
        if (oldFingerprint) {
            this.fingerprints[path] = null;
            if (oldFingerprint === newFingerprint) {
                // nothing changed
                return FileStatus.Unchanged;
            }
            return FileStatus.Changed;
        }
        return FileStatus.Added;
    };
    TreeDiffer.prototype.detectDeletionsAndUpdateFingerprints = function (result) {
        for (var absolutePath in this.fingerprints) {
            if (!(this.include && !absolutePath.match(this.include)) &&
                !(this.exclude && absolutePath.match(this.exclude))) {
                if (this.fingerprints[absolutePath] !== null) {
                    var relativePath = path.relative(this.rootPath, absolutePath);
                    result.removedPaths.push(relativePath);
                }
            }
        }
        this.fingerprints = this.nextFingerprints;
        this.nextFingerprints = Object.create(null);
    };
    return TreeDiffer;
}());
exports.TreeDiffer = TreeDiffer;
var DiffResult = (function () {
    function DiffResult(label) {
        if (label === void 0) { label = ''; }
        this.label = label;
        this.addedPaths = [];
        this.changedPaths = [];
        this.removedPaths = [];
    }
    DiffResult.prototype.log = function (verbose) { };
    DiffResult.prototype.toString = function () {
        // TODO(@caitp): more meaningful logging
        return '';
    };
    return DiffResult;
}());
exports.DiffResult = DiffResult;
var DirtyCheckingDiffResult = (function (_super) {
    __extends(DirtyCheckingDiffResult, _super);
    function DirtyCheckingDiffResult(label, directoryName) {
        _super.call(this, label);
        this.directoryName = directoryName;
        this.filesChecked = 0;
        this.directoriesChecked = 0;
        this.startTime = Date.now();
        this.endTime = null;
    }
    DirtyCheckingDiffResult.prototype.toString = function () {
        return (pad(this.label, 30) + ", " + pad(this.endTime - this.startTime, 5) + "ms, ") +
            (pad(this.addedPaths.length + this.changedPaths.length + this.removedPaths.length, 5) + " changes ") +
            ("(files: " + pad(this.filesChecked, 5) + ", dirs: " + pad(this.directoriesChecked, 4) + ")");
    };
    DirtyCheckingDiffResult.prototype.log = function (verbose) {
        var prefixedPaths = this.addedPaths.map(function (p) { return ("+ " + p); })
            .concat(this.changedPaths.map(function (p) { return ("* " + p); }))
            .concat(this.removedPaths.map(function (p) { return ("- " + p); }));
        console.log(("Tree diff: " + this) + ((verbose && prefixedPaths.length) ?
            " [\n  " + prefixedPaths.join('\n  ') + "\n]" :
            ''));
    };
    return DirtyCheckingDiffResult;
}(DiffResult));
function pad(value, length) {
    value = '' + value;
    var whitespaceLength = (value.length < length) ? length - value.length : 0;
    whitespaceLength = whitespaceLength + 1;
    return new Array(whitespaceLength).join(' ') + value;
}
var FileStatus;
(function (FileStatus) {
    FileStatus[FileStatus["Added"] = 0] = "Added";
    FileStatus[FileStatus["Unchanged"] = 1] = "Unchanged";
    FileStatus[FileStatus["Changed"] = 2] = "Changed";
})(FileStatus || (FileStatus = {}));
//# sourceMappingURL=tree-differ.js.map