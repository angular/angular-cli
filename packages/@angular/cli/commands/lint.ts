const Command = require('../ember-cli/lib/models/command');


export interface LintCommandOptions {
  fix?: boolean;
  typeCheck?: boolean;
  format?: string;
  force?: boolean;
}

export default Command.extend({
  name: 'lint',
  aliases: ['l'],
  description: 'Lints code in existing project.',
  works: 'insideProject',
  availableOptions: [],
  run: function (commandOptions: LintCommandOptions) {
    const LintTask = require('../tasks/lint').default;

    const lintTask = new LintTask({
      ui: this.ui,
      project: this.project
    });

    return lintTask.run(commandOptions);
  }
});
