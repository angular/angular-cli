const Command = require('../ember-cli/lib/models/command');

export interface LintCommandOptions {
  fix?: boolean;
  format?: string;
  force?: boolean;
  output?: string;
}

export default Command.extend({
  name: 'lint',
  aliases: ['l'],
  description: 'Lints code in existing project',
  works: 'insideProject',
  availableOptions: [
    { name: 'fix', type: Boolean, default: false },
    { name: 'force', type: Boolean, default: false },
    { name: 'format', alias: 't', type: String, default: 'prose' },
    { name: 'output', alias: 'o', type: String, default: '' }
  ],
  run: function (commandOptions: LintCommandOptions) {
    const LintTask = require('../tasks/lint').default;

    const lintTask = new LintTask({
      ui: this.ui,
      project: this.project
    });

    return lintTask.run(commandOptions);
  }
});
