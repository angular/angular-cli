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

(async () => {
  try {
    await testFunction();
  } catch (e) {
    console.error('Test Process error', e);
    process.exitCode = -1;
  } finally {
    await killAllProcesses();
  }
})();
