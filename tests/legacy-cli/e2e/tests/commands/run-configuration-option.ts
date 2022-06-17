import { silentNg } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const errorMatch = `Provide the configuration as part of the target 'ng run test-project:build:production`;

  {
    const { message } = await expectToFail(() =>
      silentNg('run', 'test-project:build:development', '--configuration=production'),
    );

    if (!message.includes(errorMatch)) {
      throw new Error(`Expected error to include '${errorMatch}' but didn't.\n\n${message}`);
    }
  }

  {
    const { message } = await expectToFail(() =>
      silentNg('run', 'test-project:build', '--configuration=production'),
    );

    if (!message.includes(errorMatch)) {
      throw new Error(`Expected error to include '${errorMatch}' but didn't.\n\n${message}`);
    }
  }
}
