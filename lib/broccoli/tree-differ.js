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
    function TreeDiffer(rootPath, includeExtensions, excludeExtensions) {
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
            if (curr.charAt(0) !== ".")
                throw new TypeError("Extension must begin with '.'");
            var kSpecialRegexpChars = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
            curr = '(' + curr.replace(kSpecialRegexpChars, '\\$&') + ')';
            return prev ? (prev + '|' + curr) : curr;
        }
    }
    TreeDiffer.prototype.diffTree = function () {
        var result = new DirtyCheckingDiffResult(this.rootDirName);
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
                    if (_this.isFileDirty(absolutePath, pathStat)) {
                        result.changedPaths.push(path.relative(_this.rootPath, absolutePath));
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
                return false;
            }
        }
        return true;
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
})();
exports.TreeDiffer = TreeDiffer;
var DirtyCheckingDiffResult = (function () {
    function DirtyCheckingDiffResult(name) {
        this.name = name;
        this.filesChecked = 0;
        this.directoriesChecked = 0;
        this.changedPaths = [];
        this.removedPaths = [];
        this.startTime = Date.now();
        this.endTime = null;
    }
    DirtyCheckingDiffResult.prototype.toString = function () {
        return (pad(this.name, 40) + ", duration: " + pad(this.endTime - this.startTime, 5) + "ms, ") +
            (pad(this.changedPaths.length + this.removedPaths.length, 5) + " changes detected ") +
            ("(files: " + pad(this.filesChecked, 5) + ", directories: " + pad(this.directoriesChecked, 4) + ")");
    };
    DirtyCheckingDiffResult.prototype.log = function (verbose) {
        var prefixedPaths = this.changedPaths.map(function (p) { return ("* " + p); }).concat(this.removedPaths.map(function (p) { return ("- " + p); }));
        console.log(("Tree diff: " + this) + ((verbose && prefixedPaths.length) ?
        " [\n  " + prefixedPaths.join('\n  ') + "\n]" :
            ''));
    };
    return DirtyCheckingDiffResult;
})();
function pad(value, length) {
    value = '' + value;
    var whitespaceLength = (value.length < length) ? length - value.length : 0;
    whitespaceLength = whitespaceLength + 1;
    return new Array(whitespaceLength).join(' ') + value;
}
