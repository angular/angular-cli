import assert from 'node:assert/strict';
import { silentNg } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const errorMatch = `Provide the configuration as part of the target 'ng run test-project:build:production`;

  {
    const { message } = await expectToFail(() =>
      silentNg('run', 'test-project:build:development', '--configuration=production'),
    );

    assert.ok(message.includes(errorMatch));
  }

  {
    const { message } = await expectToFail(() =>
      silentNg('run', 'test-project:build', '--configuration=production'),
    );

    assert.ok(message.includes(errorMatch));
  }
}
