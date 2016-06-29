// Copyright Google Inc. All Rights Reserved.
// Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
// at https://angular.io/license
import * as Task from 'ember-cli/lib/models/task';
import * as opn from 'opn';

const DocTask = Task.extend({
  run: function(keyword: string) {
    var searchUrl = `https://angular.io/docs/ts/latest/api/#!?apiFilter=${keyword}`; 
    return opn(searchUrl, { wait: false });
  }
});

module.exports = DocTask;