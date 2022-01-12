import { join } from 'path';
import { createDir, expectFileNotToExist, expectFileToExist } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  const cachePath = '.angular/cache';
  const staleCachePath = join(cachePath, 'v1.0.0');

  // Enable cache for all environments
  await updateJsonFile('angular.json', (config) => {
    config.cli ??= {};
    config.cli.cache = {
      environment: 'all',
      enabled: true,
      path: cachePath,
    };
  });

  // Create a dummy stale disk cache directory.
  await createDir(staleCachePath);
  await expectFileToExist(staleCachePath);

  await ng('build');
  await expectFileToExist(cachePath);
  await expectFileNotToExist(staleCachePath);
}
