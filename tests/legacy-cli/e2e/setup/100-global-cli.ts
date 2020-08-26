import { getGlobalVariable } from '../utils/env';
import { exec, silentNpm } from '../utils/process';

export default async function() {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  // Install global Angular CLI.
  await silentNpm(
    'install',
    '--global',
    '@angular/cli',
    '--registry=http://localhost:4873',
  );

  try {
    await exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng');
  } catch {}
}
