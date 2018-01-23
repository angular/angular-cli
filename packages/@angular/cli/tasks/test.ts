import { runTarget } from '../utilities/architect';
import { TestOptions } from '../commands/test';
const Task = require('../ember-cli/lib/models/task');


export default Task.extend({
  run: function (options: TestOptions) {
    return runTarget(this.project.root, 'karma', options).toPromise().then(buildEvent => {
      if (buildEvent.success === false) {
        return Promise.reject('Run failed');
      }
    });
  }
});
