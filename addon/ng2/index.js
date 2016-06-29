// Copyright Google Inc. All Rights Reserved.
// Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
// at https://angular.io/license
/* jshint node: true */
'use strict';

const config = require('./models/config');

module.exports = {
  name: 'ng2',

  config: function () {
    this.project.ngConfig = this.project.ngConfig || config.CliConfig.fromProject();
  },

  includedCommands: function () {
    return {
      'new': require('./commands/new'),
      'generate': require('./commands/generate'),
      'init': require('./commands/init'),
      'test': require('./commands/test'),
      'e2e': require('./commands/e2e'),
      'lint': require('./commands/lint'),
      'version': require('./commands/version'),
      'completion': require('./commands/completion'),
      'doc': require('./commands/doc'),
      'github-pages-deploy': require('./commands/github-pages-deploy'),

      // Easter eggs.
      'make-this-awesome': require('./commands/easter-egg')('make-this-awesome'),

      // Configuration.
      'set': require('./commands/set'),
      'get': require('./commands/get')
    };
  }
};
