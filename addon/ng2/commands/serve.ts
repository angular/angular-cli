import * as CommandHelper from '../utilities/command-helper';
import * as ServeCommand from 'ember-cli/lib/commands/serve';

module.exports = ServeCommand.extend({

  beforeRun: function() {
    CommandHelper.loadDefaults(this);
  },

});

module.exports.overrideCore = true;
