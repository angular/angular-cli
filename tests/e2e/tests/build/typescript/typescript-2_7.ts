import { ng, npm } from '../../../utils/process';

export default async function () {
  await npm('install', 'typescript@2.7');
  await ng('build');
  await ng('build', '--prod');
  await npm('install', 'typescript@2.6');
}
