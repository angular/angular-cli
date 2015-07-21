/* jshint node: true */
'use strict';

module.exports = {
  name: 'ng2',
  includedCommands: function() {
    return {
      'new': require('./commands/new'),
      'init': require('./commands/init')
    };
  }
};
