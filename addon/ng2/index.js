/* jshint node: true */
'use strict';

module.exports = {
  name: 'ng2',
  includedCommands: function() {
    return {
      'new'       : require('./commands/new'),
      'init'      : require('./commands/init'),
      'test'      : require('./commands/test'),
      'e2e'       : require('./commands/e2e'),
      'lint'      : require('./commands/lint'),
      'format'    : require('./commands/format'),
      'version'   : require('./commands/version')
    };
  }
};
