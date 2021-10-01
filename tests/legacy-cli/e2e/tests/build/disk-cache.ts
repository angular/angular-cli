import { expectFileNotToExist, expectFileToExist, rimraf } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const defaultCachePath = '.angular/cache';
const overriddenCachePath = '.cache/angular-cli';

export default async function () {
  const originalCIValue = process.env['CI'];

  try {
    // Should be enabled by default.
    process.env['CI'] = '0';
    await configureAndRunTest();

    // Should not write cache when it's disabled
    await configureAndRunTest({ enabled: false });
    await expectFileNotToExist(defaultCachePath);

    // Should not write cache by default when in CI.
    process.env['CI'] = '1';
    await configureAndRunTest();
    await expectFileNotToExist(defaultCachePath);

    // Should write cache when it's enabled and 'environment' is set to 'all' or 'ci'.
    await configureAndRunTest({ environment: 'all' });
    await expectFileToExist(defaultCachePath);

    // Should write cache to custom path when configured.
    await configureAndRunTest({ environment: 'ci', path: overriddenCachePath });
    await expectFileNotToExist(defaultCachePath);
    await expectFileToExist(overriddenCachePath);
  } finally {
    process.env['CI'] = originalCIValue;
  }
}

async function configureAndRunTest(cacheOptions?: {
  environment?: 'ci' | 'local' | 'all';
  enabled?: boolean;
  path?: string;
}): Promise<void> {
  await Promise.all([
    rimraf(overriddenCachePath),
    rimraf(defaultCachePath),
    updateJsonFile('angular.json', (config) => {
      config.cli ??= {};
      config.cli.cache = cacheOptions;
    }),
  ]);

  await ng('build');
}
