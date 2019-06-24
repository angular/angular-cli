import { ng, node, npm } from '../utils/process';

export default async function() {
  console.log('Environment:');

  Object.keys(process.env).forEach(envName => {
    console.log(`  ${envName}: ${process.env[envName].replace(/[\n\r]+/g, '\n        ')}`);
  });

  await node('--version');
  await npm('--version');
  await ng('version');
}
