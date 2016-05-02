import * as Command from 'ember-cli/lib/models/command';
import * as E2ETask from '../tasks/e2e';
import {CliConfig} from '../models/config';

module.exports = Command.extend({
  name: 'e2e',
  description: 'Run e2e tests in existing project',
  works: 'insideProject',
  run: function () {
    this.project.ngConfig = this.project.ngConfig || CliConfig.fromProject();

    var e2eTask = new E2ETask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return e2eTask.run();
  }
});
