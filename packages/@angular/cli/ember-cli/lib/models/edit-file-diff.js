'use strict';

const fs = require('fs-extra');
const RSVP = require('rsvp');
const jsdiff = require('diff');
const temp = require('temp').track();
const path = require('path');
const SilentError = require('silent-error');
const openEditor = require('../utilities/open-editor');

class EditFileDiff {
  constructor(options) {
    this.info = options.info;
  }

  edit() {
    return RSVP.hash({
      input: this.info.render(),
      output: fs.readFile(this.info.outputPath),
    })
      .then(this.invokeEditor.bind(this))
      .then(this.applyPatch.bind(this))
      .finally(this.cleanUp.bind(this));
  }

  cleanUp() {
    temp.cleanupSync();
  }

  applyPatch(resultHash) {
    return RSVP.hash({
      diffString: fs.readFile(resultHash.diffPath),
      currentString: fs.readFile(resultHash.outputPath),
    }).then(result => {
      let appliedDiff = jsdiff.applyPatch(result.currentString.toString(), result.diffString.toString());

      if (!appliedDiff) {
        let message = 'Patch was not cleanly applied.';
        this.info.ui.writeLine(`${message} Please choose another action.`);
        throw new SilentError(message);
      }

      return fs.writeFile(resultHash.outputPath, appliedDiff);
    });
  }

  invokeEditor(result) {
    let info = this.info;
    let diff = jsdiff.createPatch(info.outputPath, result.output.toString(), result.input);
    let diffPath = path.join(temp.mkdirSync(), 'currentDiff.diff');

    return fs.writeFile(diffPath, diff)
      .then(() => openEditor(diffPath))
      .then(() => ({ outputPath: info.outputPath, diffPath }));
  }
}

module.exports = EditFileDiff;
