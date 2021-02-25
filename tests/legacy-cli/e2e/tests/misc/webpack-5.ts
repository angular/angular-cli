import { getGlobalVariable } from '../../utils/env';
import { rimraf } from '../../utils/fs';
import { killAllProcesses, ng, silentYarn } from '../../utils/process';
import { ngServe, updateJsonFile } from '../../utils/project';

export default async function() {
  // Setup project for yarn usage
  await rimraf('node_modules');
  await updateJsonFile('package.json', (json) => {
    json.resolutions = { webpack: '5.1.3' };
  });
  const testRegistry = getGlobalVariable('package-registry');
  await silentYarn(`--registry=${testRegistry}`);

  // Ensure webpack 5 is used
  const { stdout } = await silentYarn('list', '--pattern', 'webpack');
  if (!/\swebpack@5/.test(stdout)) {
    throw new Error('Expected Webpack 5 to be installed.');
  }
  if (/\swebpack@4/.test(stdout)) {
    throw new Error('Expected Webpack 4 to not be installed.');
  }

  // Execute the CLI with Webpack 5
  await ng('test', '--watch=false');
  await ng('build');
  await ng('build', '--prod');
  await ng('e2e');
  try {
    await ngServe();
  } finally {
    killAllProcesses();
  }
}
