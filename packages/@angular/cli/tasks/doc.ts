const Task = require('../ember-cli/lib/models/task');
const opn = require('opn');

export const DocTask: any = Task.extend({
  run: function(keyword: string, search: boolean) {
    const searchUrl = search ? `https://angular.io/search/#stq=${keyword}&stp=1` :
     `https://angular.io/docs/ts/latest/api/#!?query=${keyword}`;

    return opn(searchUrl, { wait: false });
  }
});
