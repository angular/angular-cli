import { appendToFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function() {
  await appendToFile('src/main.ts', 'console.log(\'changed\');\n');

  const { message } = await expectToFail(() => ng('update', '--all'));
  if (!message || !message.includes('Repository is not clean.')) {
    throw new Error('Expected unclean repository');
  }
}
