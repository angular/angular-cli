import { getActivePackageManager } from '../utils/packages';
import { exec, ng } from '../utils/process';
import { isWindowsTestMode } from '../utils/wsl';

export default async function () {
  console.log('Environment:');

  Object.keys(process.env).forEach((envName) => {
    // CI Logs should not contain environment variables that are considered secret
    const lowerName = envName.toLowerCase();
    if (lowerName.includes('key') || lowerName.includes('secret')) {
      return;
    }

    console.log(`  ${envName}: ${process.env[envName]!.replace(/[\n\r]+/g, '\n        ')}`);
  });

  // On Windows, `which` might not be available.
  if (!isWindowsTestMode()) {
    await exec('which', 'ng', getActivePackageManager());
  }

  await ng('version');
}
