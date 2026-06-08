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
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
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
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
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
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
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
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
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
        'should transform fakeAsync test to `vi.useFakeTimers()` in `beforeEach` and preserve flush behavior',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
          
            let count = 0;
            beforeEach(fakeAsync(() => {
              setTimeout(() => ++count, 100);
            }));

            it('works', fakeAsync(() => {
              expect(count).toBe(1);
            }));
          });
      `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
              vi.useRealTimers();
            });

            let count = 0;
            beforeEach(async () => {
              setTimeout(() => ++count, 100);
              await vi.runOnlyPendingTimersAsync();
            });

            it('works', async () => {
              expect(count).toBe(1);
            });
          });
      `,
    },
    {
      description: 'should transform fakeAsync test to `vi.useFakeTimers()` in `afterEach`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            afterEach(fakeAsync(() => {
              console.log('afterEach');
            }));
          });
        `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
              vi.useRealTimers();
            });
            afterEach(async () => {
              console.log('afterEach');
            });
          });
        `,
    },
    {
      description: 'should transform fakeAsync test to `vi.useFakeTimers()` in `beforeAll`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            beforeAll(fakeAsync(() => {
              console.log('beforeAll');
            }));
          });
        `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
              vi.useRealTimers();
            });
            beforeAll(async () => {
              console.log('beforeAll');
            });
          });
        `,
    },
    {
      description: 'should transform fakeAsync test to `vi.useFakeTimers()` in `afterAll`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            afterAll(fakeAsync(() => {
              console.log('afterAll');
            }));
          });
        `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
              vi.useRealTimers();
            });
            afterAll(async () => {
              console.log('afterAll');
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
    {
      description: 'should not append `vi.runOnlyPendingTimersAsync()` in `test` or `afterEach`',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            afterEach(fakeAsync(() => {
              console.log('afterEach');
            }));

            it('works', fakeAsync(() => {
              expect(1).toBe(1);
            }));
          });
      `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
              vi.useRealTimers();
            });
            afterEach(async () => {
              console.log('afterEach');
            });

            it('works', async () => {
              expect(1).toBe(1);
            });
          });
      `,
    },
    {
      description:
        'should not append `vi.runOnlyPendingTimersAsync()` if `flush` option is set to false',
      input: `
          import { fakeAsync } from '@angular/core/testing';

          describe('My fakeAsync suite', () => {
            beforeEach(fakeAsync(() => {
              console.log('beforeEach');
            }, {flush: false}));
          });
      `,
      expected: `
          describe('My fakeAsync suite', () => {
            beforeEach(() => {
              vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
            });
            afterEach(() => {
              vi.useRealTimers();
            });
            beforeEach(async () => {
              console.log('beforeEach');
            });
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
