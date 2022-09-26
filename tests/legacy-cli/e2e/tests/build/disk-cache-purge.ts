import { join } from 'path';
import { createDir, expectFileNotToExist, expectFileToExist, writeFile } from '../../utils/fs';
import { silentNg } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  const cachePath = '.angular/cache';
  const staleCachePath = join(cachePath, 'v1.0.0');

  // No need to include all applications code to verify disk cache existence.
  await writeFile('src/main.ts', 'console.log(1);');

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

  await silentNg('build');
  await expectFileToExist(cachePath);
  await expectFileNotToExist(staleCachePath);
}
