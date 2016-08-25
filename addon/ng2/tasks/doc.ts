import * as Task from 'ember-cli/lib/models/task';
import * as opn from 'opn';

const DocTask = Task.extend({
  run: function(keyword: string) {
    const searchUrl = `https://angular.io/docs/ts/latest/api/#!?apiFilter=${keyword}`;
    return opn(searchUrl, { wait: false });
  }
});

module.exports = DocTask;
