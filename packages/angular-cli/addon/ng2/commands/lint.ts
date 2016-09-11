const Command = require('ember-cli/lib/models/command');
import LintTask from '../tasks/lint';

export default Command.extend({
  name: 'lint',
  description: 'Lints code in existing project',
  works: 'insideProject',
  run: function () {
    const lintTask = new LintTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return lintTask.run();
  }
});
