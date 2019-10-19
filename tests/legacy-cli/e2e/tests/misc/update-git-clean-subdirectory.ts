import { getGlobalVariable } from '../../utils/env';
import { createDir, writeFile } from '../../utils/fs';
import { ng, silentGit } from '../../utils/process';
import { prepareProjectForE2e } from '../../utils/project';

export default async function() {
  process.chdir(getGlobalVariable('tmp-root'));

  await createDir('./subdirectory');
  process.chdir('./subdirectory');

  await silentGit('init', '.');

  await ng('new', 'subdirectory-test-project', '--skip-install');
  process.chdir('./subdirectory-test-project');
  await prepareProjectForE2e('subdirectory-test-project');

  await writeFile('../added.ts', 'console.log(\'created\');\n');
  await silentGit('add', '../added.ts');

  const { stderr } = await ng('update', '--all', '--force');
  if (stderr && stderr.includes('Repository is not clean.')) {
    throw new Error('Expected clean repository');
  }
}
