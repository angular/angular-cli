'use strict';

var fs           = require('fs');
var Promise      = require('../ext/promise');
var readFile     = Promise.denodeify(fs.readFile);
var writeFile    = Promise.denodeify(fs.writeFile);
var jsdiff       = require('diff');
var temp         = require('temp').track();
var path         = require('path');
var SilentError  = require('silent-error');
var openEditor   = require('../utilities/open-editor');

function EditFileDiff(options) {
  this.info = options.info;
}

EditFileDiff.prototype.edit = function() {
  return Promise.hash({
    input:  this.info.render(),
    output: readFile(this.info.outputPath)
  })
    .then(invokeEditor.bind(this))
    .then(applyPatch.bind(this))
    .finally(cleanUp.bind(this));
};

function cleanUp() {
  temp.cleanupSync();
}

function applyPatch(resultHash) {
  /*jshint validthis:true */
  return Promise.hash({
    diffString: readFile(resultHash.diffPath),
    currentString: readFile(resultHash.outputPath)
  }).then(function(result) {
    var appliedDiff = jsdiff.applyPatch(result.currentString.toString(), result.diffString.toString());

    if (!appliedDiff) {
      var message = 'Patch was not cleanly applied.';
      this.info.ui.writeLine(message + ' Please choose another action.');
      throw new SilentError(message);
    }

    return writeFile(resultHash.outputPath, appliedDiff);
  }.bind(this));
}

function invokeEditor(result) {
  var info     = this.info; // jshint ignore:line
  var diff     = jsdiff.createPatch(info.outputPath, result.output.toString(), result.input);
  var diffPath = path.join(temp.mkdirSync(), 'currentDiff.diff');

  return writeFile(diffPath, diff).then(function() {
    return openEditor(diffPath);
  }).then(function() {
    return { outputPath: info.outputPath, diffPath: diffPath };
  });
}

module.exports = EditFileDiff;
