/* jshint node: true, esversion: 6 */
'use strict';

const Promise = require('ember-cli/lib/ext/promise');
const exec    = Promise.denodeify(require('child_process').exec);

module.exports = function(pkg) {
  let cmd = ['typings uninstall'];
  const options = [
    '--ambient',
    '--save'
  ];
  cmd.push(pkg);

  return exec(cmd.concat(options).join(' '));
};
