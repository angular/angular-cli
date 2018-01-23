import { runTarget } from '../utilities/architect';
const Task = require('../ember-cli/lib/models/task');


export const Extracti18nTask = Task.extend({
  run: function (options: any) {
    return runTarget(this.project.root, 'extract-i18n', options).toPromise().then(buildEvent => {
      if (buildEvent.success === false) {
        return Promise.reject('Run failed');
      }
    });
  }
});
