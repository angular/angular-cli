const Task = require('../ember-cli/lib/models/task');
const opn = require('opn');

export const DocTask: any = Task.extend({
  run: function(keyword: string, search: boolean) {
    const searchUrl = search ? `https://www.google.com/search?q=site%3Aangular.io+${keyword}` :
     `https://angular.io/api?query=${keyword}`;

    return opn(searchUrl, { wait: false });
  }
});
