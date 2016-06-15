import * as CommandHelper from '../utilities/command-helper';
import * as BuildCommand from 'ember-cli/lib/commands/build';

module.exports = BuildCommand.extend({

  beforeRun: function() {      
    CommandHelper.loadDefaults(this);
  },

});

module.exports.overrideCore = true;
