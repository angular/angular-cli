'use strict';

const spawn = require('child_process').spawn;

function openEditor(file) {
  if (!openEditor.canEdit()) {
    throw new Error('EDITOR environment variable is not set');
  }

  if (!file) {
    throw new Error('No `file` option provided');
  }

  let editorArgs = openEditor._env().EDITOR.split(' ');
  let editor = editorArgs.shift();
  let editProcess = openEditor._spawn(editor, [file].concat(editorArgs), { stdio: 'inherit' });

  return new Promise((resolve, reject) => {
    editProcess.on('close', code => {
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
