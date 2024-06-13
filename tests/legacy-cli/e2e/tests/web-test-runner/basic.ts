import assert from 'node:assert';
import { after, afterEach, before, describe, it } from 'node:test';
import { noSilentNg } from '../../utils/process';
import { applyWtrBuilder } from '../../utils/web-test-runner';
import path from 'node:path';
import { getGlobalVariable } from '../../utils/env';
import { gitClean } from '../../utils/git';

describe('web-test-runner', () => {
  let initialCwd = process.cwd();
  before(() => {
    process.chdir(path.join(getGlobalVariable('projects-root'), 'test-project'));
  });
  after(() => {
    process.chdir(initialCwd);
  });

  afterEach(async () => {
    await gitClean();
  });

  it('passes `ng new` app and prints experimental message', async () => {
    await applyWtrBuilder();

    const { stderr } = await noSilentNg('test');

    assert.match(stderr, /Web Test Runner builder is currently STABLE/);
  });
});
