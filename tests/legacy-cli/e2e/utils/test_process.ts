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

(async () => Promise.resolve(testFunction()))()
  .finally(killAllProcesses)
  .catch((e) => {
    console.error(e);
    process.exitCode = -1;
  });
