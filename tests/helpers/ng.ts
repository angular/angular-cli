import cli from '@angular/cli/lib/cli';
const UI = require('@angular/cli/ember-cli/lib/ui');
const through = require('through');

function MockUI() {
  this.output = '';

  UI.call(this, {
    inputStream: through(),
    outputStream: through(function (data: any) {
      this.output += data;
    }.bind(this)),
    errorStream: through(function (data: any) {
      this.errors += data;
    }.bind(this))
  });
}

MockUI.prototype = Object.create(UI.prototype);
MockUI.prototype.constructor = MockUI;
MockUI.prototype.clear = function () {
  this.output = '';
};

export function ng(args: any) {
  process.env.PWD = process.cwd();

  return cli({
    inputStream: [],
    outputStream: [],
    cliArgs: args,
    UI: MockUI,
    testing: true
  });
}
