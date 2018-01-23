import { runTarget } from '../utilities/architect';
import { E2eTaskOptions } from '../commands/e2e';
const Task = require('../ember-cli/lib/models/task');


export const E2eTask = Task.extend({
  run: function (options: E2eTaskOptions) {
    return runTarget(this.project.root, 'protractor', options).toPromise().then(buildEvent => {
      if (buildEvent.success === false) {
        return Promise.reject('Run failed');
      }
    });
  }
});
