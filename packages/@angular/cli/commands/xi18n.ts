const Command = require('../ember-cli/lib/models/command');

export interface Xi18nOptions {
  outputPath?: string;
  verbose?: boolean;
  i18nFormat?: string;
  locale?: string;
  outFile?: string;
}

const Xi18nCommand = Command.extend({
  name: 'xi18n',
  description: 'Extracts i18n messages from source code.',
  works: 'insideProject',
  availableOptions: [],
  run: function (commandOptions: any) {
    const { Extracti18nTask } = require('../tasks/extract-i18n');

    const xi18nTask = new Extracti18nTask({
      ui: this.ui,
      project: this.project
    });

    return xi18nTask.run(commandOptions);
  }
});


export default Xi18nCommand;

