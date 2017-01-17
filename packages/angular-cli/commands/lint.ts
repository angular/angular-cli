const Command = require('../ember-cli/lib/models/command');

export default Command.extend({
  name: 'lint',
  description: 'Lints code in existing project',
  works: 'insideProject',
  run: function () {
    const LintTask = require('../tasks/lint').default;
    const lintTask = new LintTask({
      ui: this.ui,
      project: this.project
    });

    return lintTask.run();
  }
});
