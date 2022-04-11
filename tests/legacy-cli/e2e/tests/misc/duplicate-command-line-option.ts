import { ng } from '../../utils/process';
import { expectFileToExist } from '../../utils/fs';

export default async function () {
  const { stderr } = await ng(
    'generate',
    'component',
    'test-component',
    '--style=scss',
    '--style=sass',
  );

  const warningMatch = `Option 'style' has been specified multiple times. The value 'sass' will be used`;
  if (!stderr.includes(warningMatch)) {
    throw new Error(`Expected stderr to contain: "${warningMatch}".`);
  }

  await expectFileToExist('src/app/test-component/test-component.component.sass');
}
