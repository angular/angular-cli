import { killAllProcesses } from './process';

const testScript: string = process.argv[2];
const testModule = require(testScript);
const testFunction: () => Promise<void> | void =
  typeof testModule == 'function'
    ? testModule
    : typeof testModule.default == 'function'
      ? testModule.default
      : () => {
          throw new Error('Invalid test module.');
        };

// 4-minute timeout to prevent hanging tests from blocking the runner indefinitely.
const TEST_TIMEOUT_MS = 4 * 60 * 1000;

(async () => {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Test "${testScript}" timed out after 4 minutes.`));
      }, TEST_TIMEOUT_MS);
    });

    await Promise.race([testFunction(), timeoutPromise]);
  } catch (e) {
    console.error('Test Process error', e);
    process.exitCode = -1;
  } finally {
    clearTimeout(timeoutId);
    await killAllProcesses().finally(() => process.exit());
  }
})();
