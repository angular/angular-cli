/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { expectTransformation } from '../test-helpers';

describe('transformFakeAsyncTest', () => {
  const testCases = [
    {
      description: 'should transform fakeAsync test to `vi.useFakeTimers()`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            it('works', fakeAsync(() => {
              expect(1).toBe(1);
            }));
          });
        `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeAll(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterAll(() => {
              vi.useRealTimers();
            });
            it('works', async () => {
              expect(1).toBe(1);
            });
          });
        `,
    },
    {
      description:
        'should transform fakeAsync test to `vi.useFakeTimers()` and keep its arguments but not the return type',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            it('works', fakeAsync((strangeArg: Strange = myStrangeDefault): void => {
              expect(1).toBe(1);
            }));
          });
        `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeAll(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterAll(() => {
              vi.useRealTimers();
            });
            it('works', async (strangeArg: Strange = myStrangeDefault) => {
              expect(1).toBe(1);
            });
          });
        `,
    },
    {
      description: 'should transform fakeAsync test to `vi.useFakeTimers()` in outer describe',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My non-fakeAsync suite', () => {
            it('works', () => {
              expect(1).toBe(1);
            });
          });

          describe('My outer fakeAsync suite', () => {
          
            describe('My inner fakeAsync suite', () => {
              it('works', fakeAsync(() => {
                expect(1).toBe(1);
              }));
            });

          });

        `,
      expected: `
          describe('My non-fakeAsync suite', () => {
            it('works', () => {
              expect(1).toBe(1);
            });
          });

          describe('My outer fakeAsync suite', () => {
            beforeAll(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterAll(() => {
              vi.useRealTimers();
            });

            describe('My inner fakeAsync suite', () => {
              it('works', async () => {
                expect(1).toBe(1);
              });
            });
          });
        `,
    },
    {
      description:
        'should transform fakeAsync test to `vi.useFakeTimers()` in outer describe even if it is excluded',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My non-fakeAsync suite', () => {
            it('works', () => {
              expect(1).toBe(1);
            });
          });

          xdescribe('My outer fakeAsync suite', () => {
          
            describe('My inner fakeAsync suite', () => {
              it('works', fakeAsync(() => {
                expect(1).toBe(1);
              }));
            });

          });

        `,
      expected: `
          describe('My non-fakeAsync suite', () => {
            it('works', () => {
              expect(1).toBe(1);
            });
          });

          describe.skip('My outer fakeAsync suite', () => {
            beforeAll(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterAll(() => {
              vi.useRealTimers();
            });

            describe('My inner fakeAsync suite', () => {
              it('works', async () => {
                expect(1).toBe(1);
              });
            });
          });
        `,
    },
    {
      description:
        'should transform fakeAsync test to `vi.useFakeTimers()` in `beforeEach`, `afterEach`, `beforeAll`, `afterAll`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            beforeAll(fakeAsync(() => {
              console.log('beforeAll');
            }));

            afterAll(fakeAsync(() => {
              console.log('afterAll');
            }));

            beforeEach(fakeAsync(() => {
              console.log('beforeEach');
            }));

            afterEach(fakeAsync(() => {
              console.log('afterEach');
            }));
          });
        `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeAll(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterAll(() => {
              vi.useRealTimers();
            });
            beforeAll(async () => {
              console.log('beforeAll');
            });

            afterAll(async () => {
              console.log('afterAll');
            });

            beforeEach(async () => {
              console.log('beforeEach');
            });

            afterEach(async () => {
              console.log('afterEach');
            });
          });
        `,
    },
    {
      description: 'should not replace `fakeAsync` if not used within a describe block',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          it('works', fakeAsync(() => {
            expect(1).toBe(1);
          }));
        `,
      expected: `
          import { fakeAsync } from '@angular/core/testing';

          it('works', fakeAsync(() => {
            expect(1).toBe(1);
          }));
        `,
    },
    {
      description: 'should not replace `fakeAsync` if not imported from `@angular/core/testing`',
      input: `
          import { fakeAsync } from './my-fake-async';

          describe('My fakeAsync suite', () => {
            it('works', fakeAsync(() => {
              expect(1).toBe(1);
            }));
          });
        `,
      expected: `
          import { fakeAsync } from './my-fake-async';

          describe('My fakeAsync suite', () => {
            it('works', fakeAsync(() => {
              expect(1).toBe(1);
            }));
          });
        `,
    },
  ];

  testCases.forEach(({ description, input, expected }) => {
    it(description, async () => {
      await expectTransformation(input, expected);
    });
  });
});
