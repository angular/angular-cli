import { execAndWaitForOutputToMatch } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  const originalCIValue = process.env['CI'];

  try {
    // Should be enabled by default for local builds.
    await configureTest('0' /** envCI */);
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: enabled/,
    );

    // Should be disabled by default for CI builds.
    await configureTest('1' /** envCI */, { enabled: true });
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: disabled/,
    );

    // Should be enabled by when environment is local and env is not CI.
    await configureTest('0' /** envCI */, { environment: 'local' });
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: enabled/,
    );

    // Should be disabled by when environment is local and env is CI.
    await configureTest('1' /** envCI */, { environment: 'local' });
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: disabled/,
    );

    // Effective status should be enabled when 'environment' is set to 'all' or 'ci'.
    await configureTest('1' /** envCI */, { environment: 'all' });
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: enabled/,
    );

    // Effective status should be enabled when 'environment' is set to 'ci' and run is in ci
    await configureTest('1' /** envCI */, { environment: 'ci' });
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: enabled/,
    );

    // Effective status should be disabled when 'enabled' is set to false
    await configureTest('1' /** envCI */, { environment: 'all', enabled: false });
    await execAndWaitForOutputToMatch(
      'ng',
      ['cache', 'info'],
      /Effective status on current machine: disabled/,
    );
  } finally {
    process.env['CI'] = originalCIValue;
  }
}

async function configureTest(
  envCI: '1' | '0',
  cacheOptions?: {
    environment?: 'ci' | 'local' | 'all';
    enabled?: boolean;
  },
): Promise<void> {
  process.env['CI'] = envCI;

  await updateJsonFile('angular.json', (config) => {
    config.cli ??= {};
    config.cli.cache = cacheOptions;
  });
}
