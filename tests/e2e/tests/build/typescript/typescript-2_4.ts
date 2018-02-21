import { ng, npm } from '../../../utils/process';

export default async function () {
  await npm('install', 'typescript@2.4');
  await ng('build');
  await ng('build', '--prod');
  await npm('install', 'typescript@2.6');
}
