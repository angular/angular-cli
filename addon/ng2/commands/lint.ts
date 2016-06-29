// Copyright Google Inc. All Rights Reserved.
// Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
// at https://angular.io/license
import * as Command from 'ember-cli/lib/models/command';
import * as LintTask from '../tasks/lint';

module.exports = Command.extend({
  name: 'lint',
  description: 'Lints code in existing project',
  works: 'insideProject',
  run: function () {
    var lintTask = new LintTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return lintTask.run();
  }
});
