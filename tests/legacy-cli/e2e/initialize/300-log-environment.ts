import { git, ng } from '../utils/process';

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

  await ng('version');
  await git('--version');
  await git('config', '--list', '--show-origin');
}
