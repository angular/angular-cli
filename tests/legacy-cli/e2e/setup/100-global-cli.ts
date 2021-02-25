import { getGlobalVariable } from '../utils/env';
import { exec, silentNpm } from '../utils/process';

export default async function() {
  const argv = getGlobalVariable('argv');
  if (argv.noglobal) {
    return;
  }

  const testRegistry = getGlobalVariable('package-registry');

  // Install global Angular CLI.
  await silentNpm(
    'install',
    '--global',
    '@angular/cli',
    `--registry=${testRegistry}`,
  );

  try {
    await exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng');
  } catch {}
}
