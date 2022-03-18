import { readFile } from '../../../utils/fs';
import { ng } from '../../../utils/process';

export default async function () {
  await ng('cache', 'enable');
  if (JSON.parse(await readFile('angular.json')).cli.cache.enabled !== true) {
    throw new Error(`Expected 'cli.cache.enable' to be true.`);
  }

  await ng('cache', 'disable');
  if (JSON.parse(await readFile('angular.json')).cli.cache.enabled !== false) {
    throw new Error(`Expected 'cli.cache.enable' to be false.`);
  }
}
