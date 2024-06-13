import { it } from 'node:test';

const testScript: string = process.env['NG_TEST_ENTRY']!;
const testModule = require(testScript);
const testFunction: () => Promise<void> | void =
  typeof testModule == 'function'
    ? testModule
    : typeof testModule.default == 'function'
      ? testModule.default
      : () => {
          throw new Error('Invalid test module.');
        };

it(testScript, testFunction);
