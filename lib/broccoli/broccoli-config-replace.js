'use strict';

var fs = require('fs-extra');
var path = require('path');
var Writer = require('broccoli-writer');

function CustomReplace(inputTree, options) {
  if (!(this instanceof CustomReplace)) {
    return new CustomReplace(inputTree, options);
  }

  Writer.call(this, inputTree, options); // this._super();

  this.inputTree = inputTree;
  this.options = options;
}
CustomReplace.prototype = Object.create(Writer.prototype);
CustomReplace.prototype.constructor = CustomReplace;

CustomReplace.prototype.write = function (readTree, destDir) {
  var inputDir;

  return readTree(this.inputTree)
    .then(function (path) {
      inputDir = path;

      return {
        inputDir: inputDir,
        destDir: destDir
      };
    })
    .then(this.process.bind(this));
};

CustomReplace.prototype.process = function (results) {
  var files = this.options.files;

  for (var i = 0, l = files.length; i < l; i++) {
    var file = files[i];
    var filePath = path.join(results.inputDir, file);
    var destPath = path.join(results.destDir, file);

    this.processFile(filePath, destPath);
  }
};

CustomReplace.prototype.processFile = function (filePath, destPath) {
  var contents = fs.readFileSync(filePath, { encoding: 'utf8' });

  for (var i = 0, l = this.options.patterns.length; i < l; i++) {
    // jshint loopfunc:true
    var pattern = this.options.patterns[i];
    var replacement = pattern.replacement;

    if (typeof pattern.replacement === 'function') {
      replacement = function () {
        var args = Array.prototype.slice.call(arguments);
        return pattern.replacement.apply(null, args);
      };
    }

    contents = contents.replace(pattern.match, replacement);
  }

  if (!fs.existsSync(path.dirname(destPath))) {
    fs.mkdirsSync(path.dirname(destPath));
  }
  fs.writeFileSync(destPath, contents, { encoding: 'utf8' });
};

module.exports = CustomReplace;
