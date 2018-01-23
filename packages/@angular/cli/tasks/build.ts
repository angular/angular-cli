import { runTarget } from '../utilities/architect';
import { BuildTaskOptions } from '../commands/build';
const Task = require('../ember-cli/lib/models/task');


export default Task.extend({
  run: function (options: BuildTaskOptions) {
    return runTarget(this.project.root, 'browser', options).toPromise().then(buildEvent => {
      if (buildEvent.success === false) {
        return Promise.reject('Run failed');
      }
    });
  }
});
