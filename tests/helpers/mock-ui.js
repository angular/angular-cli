'use strict';

const UI = require('@angular/cli/ember-cli/lib/ui');
const through = require('through');

module.exports = MockUI;
function MockUI() {
  this.output = '';

  UI.call(this, {
    inputStream: through(),
    outputStream: through(function (data) {
      this.output += data;
    }.bind(this)),
    errorStream: through(function (data) {
      this.errors += data;
    }.bind(this))
  });
}

MockUI.prototype = Object.create(UI.prototype);
MockUI.prototype.constructor = MockUI;
MockUI.prototype.clear = function () {
  this.output = '';
};
