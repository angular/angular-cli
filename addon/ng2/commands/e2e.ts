const Command = require('ember-cli/lib/models/command');
import {E2eTask} from '../tasks/e2e';
import {CliConfig} from '../models/config';

const E2eCommand = Command.extend({
  name: 'e2e',
  description: 'Run e2e tests in existing project',
  works: 'insideProject',
  run: function () {
    this.project.ngConfig = this.project.ngConfig || CliConfig.fromProject();

    const e2eTask = new E2eTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return e2eTask.run();
  }
});


export default E2eCommand;
