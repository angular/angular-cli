import assert from 'node:assert';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const error = await expectToFail(() => ng('build', '--configuration', 'invalid'));
  assert.match(
    error.message,
    /Configuration 'invalid' for target 'build' in project 'test-project' is not set in the workspace/,
  );
}
