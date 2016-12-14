import E2eCommand from 'angular-cli/commands/e2e';
import { CliConfig } from 'angular-cli/models/config/config';
import { stub } from 'sinon';
import { expect } from 'chai';
import * as proc from 'child_process';

const MockUI = require('../../helpers/mock-ui');
const MockAnalytics = require('../../helpers/mock-analytics');
const MockProject = require('../../helpers/mock-project');

function createProject() {
  const project = new MockProject();
  project.isEmberCLIProject = () => true;
  project.ngConfig = CliConfig.fromJson({
    e2e: {
      protractor: {
        config: 'some-config'
      }
    }
  });

  return project;
}

describe('e2e command', () => {
  let command: E2eCommand;

  beforeEach(() => {
    command = new E2eCommand({
      settings: {},
      project: createProject(),
      ui: new MockUI(),
      analytics: new MockAnalytics(),
    });
  });

  beforeEach(() => {
    stub(proc, 'exec').callsArg(1);
  });

  it('passes through the suite option', () => {
    const commandOption = '--suite=suiteA';
    return command.validateAndRun([commandOption]).then(() => {
      expect(proc.exec.calledOnce).to.be.true;
      expect(proc.exec.firstCall.args[0]).to.have.string(` ${commandOption}`);
    });
  });
});
