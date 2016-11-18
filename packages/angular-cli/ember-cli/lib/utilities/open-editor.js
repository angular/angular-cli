'use strict';

var Promise = require('../ext/promise');
var spawn = require('child_process').spawn;

function openEditor(file) {
  if (!openEditor.canEdit()) {
    throw new Error('EDITOR environment variable is not set');
  }

  if (!file) {
    throw new Error('No `file` option provided');
  }

  var editorArgs  = openEditor._env().EDITOR.split(' ');
  var editor      = editorArgs.shift();
  var editProcess = openEditor._spawn(editor, [file].concat(editorArgs), {stdio: 'inherit'});

  return new Promise(function(resolve, reject) {
    editProcess.on('close', function (code) {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

openEditor.canEdit = function() {
  return openEditor._env().EDITOR !== undefined;
};

openEditor._env = function() {
  return process.env;
};

openEditor._spawn = function() {
  return spawn.apply(this, arguments);
};

module.exports = openEditor;
