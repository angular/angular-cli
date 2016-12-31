import E2eCommand from 'angular-cli/commands/e2e';
import { CliConfig } from 'angular-cli/models/config/config';
import { stub, SinonStub } from 'sinon';
import { expect } from 'chai';
import * as proc from 'child_process';

const MockUI = require('../../helpers/mock-ui');
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
  let command: any;
  let exec: SinonStub;

  beforeEach(() => {
    command = new E2eCommand({
      settings: {},
      project: createProject(),
      ui: new MockUI(),
    });
  });

  beforeEach(() => {
    exec = stub(proc, 'exec').callsArg(1);
  });

  afterEach(() => {
    exec.restore();
  });

  it('passes through the suite option', () => {
    return command.validateAndRun(['--suite', 'suiteA,suite B']).then(() => {
      expect(exec.calledOnce).to.be.true;
      expect(exec.firstCall.args[0]).to.have.string(' --suite="suiteA,suite B"');
    });
  });
});
