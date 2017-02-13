const Command = require('../ember-cli/lib/models/command');

export interface Xi18nOptions {
  outputPath?: string;
  verbose?: boolean;
  i18nFormat?: string;
}

const Xi18nCommand = Command.extend({
  name: 'xi18n',
  description: 'Extracts i18n messages from source code.',
  works: 'insideProject',
  availableOptions: [
    {
      name: 'i18n-format',
      type: String,
      default: 'xlf',
      aliases: ['f', {'xmb': 'xmb'}, {'xlf': 'xlf'}, {'xliff': 'xlf'}]
    },
    { name: 'output-path',    type: 'Path', default: null, aliases: ['op']},
    { name: 'verbose',        type: Boolean, default: false},
    { name: 'progress',       type: Boolean, default: true }

  ],
  run: function (commandOptions: any) {
    const {Extracti18nTask} = require('../tasks/extract-i18n');

    const xi18nTask = new Extracti18nTask({
      ui: this.ui,
      project: this.project
    });

    return xi18nTask.run(commandOptions);
  }
});


export default Xi18nCommand;

