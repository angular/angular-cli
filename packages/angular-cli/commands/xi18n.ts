const Command = require('../ember-cli/lib/models/command');

import {Extracti18nTask} from '../tasks/extract-i18n';

const Xi18nCommand = Command.extend({
  name: 'xi18n',
  description: 'Extracts i18n messages from source code.',
  works: 'insideProject',
  availableOptions: [
    {
      name: 'format',
      type: String,
      default: 'xliff',
      aliases: ['f', {'xmb': 'xmb'}, {'xlf': 'xlf'}, {'xliff': 'xliff'}]}
  ],
  run: function (commandOptions: any) {

    const xi18nTask = new Extracti18nTask({
      ui: this.ui,
      project: this.project,
      i18nFormat: commandOptions.format
    });

    return xi18nTask.run();
  }
});


export default Xi18nCommand;

