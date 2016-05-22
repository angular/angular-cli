/* jshint node: true */
'use strict';

module.exports = {
  name: 'docker',

  includedCommands: function () {
    return {
      'docker:init': require('./commands/init'),
      'docker:deploy': require('./commands/deploy'),
      'docker:push': require('./commands/push')
    };
  }
};
