const Command = require('ember-cli/lib/models/command');
import { DepsTask } from  '../tasks/deps';

const DepsCommand = Command.extend({
  name: 'deps',
  description: 'Generate a visual representation of dependenecies',
  works: 'insideProject',
  run: function () {
    const depsTask = new DepsTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return depsTask.run();
  }
});

export default DepsCommand;
