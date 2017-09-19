const Command = require('../ember-cli/lib/models/command');


const EjectCommand = Command.extend({
  name: 'eject',
  description: 'Ejects your app and output the proper webpack configuration and scripts.',

  run: function () {
    this.ui.writeLine('Eject command is not supported when used with bazel');
  }
});


export default EjectCommand;
