/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JobState } from './api';
import { createJob } from './create-job';
import { SimpleJobRegistry } from './simple-registry';
import { memoize, serialize } from './strategy';

describe('strategy.serialize()', () => {
  it('works', async () => {
    const registry = new SimpleJobRegistry();

    let started = 0;
    let finished = 0;

    registry.register(serialize()(createJob((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      input: { items: { type: 'number' } },
      output: { type: 'number' },
      jobName: 'add',
    });

    const job1 = registry.schedule('add', [1, 2, 3, 4]);
    const job2 = registry.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);
    expect(finished).toBe(0);

    job1.output.subscribe();
    expect(started).toBe(1);

    job2.output.subscribe();
    expect(started).toBe(1);  // Job2 starts when Job1 ends.

    expect(finished).toBe(0);

    await Promise.all([
      job1.promise.then(s => {
        expect(finished).toBe(1);
        expect(s).toBe(10);
      }),
      job2.promise.then(s => {
        expect(finished).toBe(2);
        expect(s).toBe(15);
      }),
    ]);

    expect(started).toBe(2);
    expect(finished).toBe(2);
  });

  it('works across jobs', async () => {
    const registry = new SimpleJobRegistry();

    let started = 0;
    let finished = 0;

    const strategy = serialize();

    registry.register(strategy(createJob((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      input: { items: { type: 'number' } },
      output: { type: 'number' },
      jobName: 'add',
    });
    registry.register(strategy(createJob((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 100));
        }, 10),
      );
    })), {
      input: { items: { type: 'number' } },
      output: { type: 'number' },
      jobName: 'add100',
    });

    const job1 = registry.schedule('add', [1, 2, 3, 4]);
    const job2 = registry.schedule('add100', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);
    expect(finished).toBe(0);

    job1.output.subscribe();
    expect(started).toBe(1);

    job2.output.subscribe();
    expect(started).toBe(1);  // Job2 starts when Job1 ends.

    expect(finished).toBe(0);

    await Promise.all([
      job1.promise.then(s => {
        expect(finished).toBe(1);
        expect(s).toBe(10);
      }),
      job2.promise.then(s => {
        expect(finished).toBe(2);
        expect(s).toBe(115);
      }),
    ]);

    expect(started).toBe(2);
    expect(finished).toBe(2);
  });
});

describe('strategy.memoize()', () => {
  it('works', async () => {
    const registry = new SimpleJobRegistry();

    let started = 0;
    let finished = 0;

    registry.register(memoize()(createJob((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      input: { items: { type: 'number' } },
      output: { type: 'number' },
      jobName: 'add',
    });

    const job1 = registry.schedule('add', [1, 2, 3, 4]);
    const job2 = registry.schedule('add', [1, 2, 3, 4]);
    const job3 = registry.schedule('add', [1, 2, 3, 4, 5]);
    const job4 = registry.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);
    expect(finished).toBe(0);

    job1.output.subscribe();
    expect(started).toBe(1);
    expect(finished).toBe(0);

    job2.output.subscribe();
    expect(started).toBe(1);  // job2 is reusing job1.
    expect(finished).toBe(0);

    job3.output.subscribe();
    expect(started).toBe(2);
    expect(finished).toBe(0);

    job4.output.subscribe();
    expect(started).toBe(2);  // job4 is reusing job3.
    expect(finished).toBe(0);

    await Promise.all([
      job1.promise.then(s => {
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(s).toBe(10);
      }),
      job2.promise.then(s => {
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(job1.state).toBe(JobState.Ended);
        expect(s).toBe(10);
      }),
      job3.promise.then(s => {
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(s).toBe(15);
      }),
      job4.promise.then(s => {
        expect(job3.state).toBe(JobState.Ended);
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(s).toBe(15);
      }),
    ]);

    expect(started).toBe(2);
    expect(finished).toBe(2);
  });
});
