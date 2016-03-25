'use strict';
var child_process = require('child_process');
var sinon = require('sinon');

class ExecStub {
  constructor() {
    this.execOrig = child_process.exec;
    this.stub = sinon.stub(child_process, 'exec', this.execStubFunc.bind(this));
    this.stack = [];
    this.failed = false;
  }
  execStubFunc(cmd) {
    let resp;

    // console.log('####running', cmd);

    if (this.failed) {
      resp = this.failedExec('ExecStub - in fail mode');
      return resp.apply(null, arguments);
    }

    if (this.stack.length === 0) {
      this.failed = true;
      resp = this.failedExec('ExecStub - expected stack size exceeded');
      return resp.apply(null, arguments);
    }

    let item = this.stack.shift();

    // console.log('####expected', item.cmd);

    if (cmd !== item.cmd) {
      this.failed = true;
      resp = this.failedExec(`ExecStub - unexpected command: ${cmd}`);
      return resp.apply(null, arguments);
    }

    return item.resp.apply(null, arguments);
  }
  hasFailed() {
    return this.failed;
  }
  hasEmptyStack() {
    return this.stack.length === 0;
  }
  restore() {
    this.stub.restore();
    return this;
  }
  addExecSuccess(cmd, sdout) {
    sdout = sdout || '';
    this.stack.push({
      cmd,
      resp: (cmd, opt, cb) => (cb ? cb : opt)(null, sdout, null)
    });
    return this;
  }
  addExecError(cmd, stderr) {
    stderr = stderr || '';
    this.stack.push({
      cmd,
      resp: (cmd, opt, cb) => (cb ? cb : opt)(new Error(stderr), null, stderr)
    });
    return this;
  }
  failedExec(reason) {
    return (cmd, opt, cb) => (cb ? cb : opt)(new Error(reason), null, reason)
  }
}

module.exports = ExecStub;
