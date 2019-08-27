/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JobState } from './api';
import { createJobHandler } from './create-job-handler';
import { SimpleJobRegistry } from './simple-registry';
import { SimpleScheduler } from './simple-scheduler';
import { strategy } from './strategy';

describe('strategy.serialize()', () => {
  let registry: SimpleJobRegistry;
  let scheduler: SimpleScheduler;

  beforeEach(() => {
    registry = new SimpleJobRegistry();
    scheduler = new SimpleScheduler(registry);
  });

  it('works', async () => {
    let started = 0;
    let finished = 0;

    registry.register(strategy.serialize()(createJobHandler((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      argument: { items: { type: 'number' } },
      output: { type: 'number' },
      name: 'add',
    });

    const job1 = scheduler.schedule('add', [1, 2, 3, 4]);
    const job2 = scheduler.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);
    expect(finished).toBe(0);

    job1.output.subscribe();
    expect(started).toBe(1);

    job2.output.subscribe();
    expect(started).toBe(1);  // Job2 starts when Job1 ends.

    expect(finished).toBe(0);

    await Promise.all([
      job1.output.toPromise().then(s => {
        expect(finished).toBe(1);
        expect(s).toBe(10);
      }),
      job2.output.toPromise().then(s => {
        expect(finished).toBe(2);
        expect(s).toBe(15);
      }),
    ]);

    expect(started).toBe(2);
    expect(finished).toBe(2);
  });

  it('works across jobs', async () => {
    let started = 0;
    let finished = 0;

    const strategy1 = strategy.serialize();

    registry.register(strategy1(createJobHandler((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      argument: { items: { type: 'number' } },
      output: { type: 'number' },
      name: 'add',
    });
    registry.register(strategy1(createJobHandler((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 100));
        }, 10),
      );
    })), {
      argument: { items: { type: 'number' } },
      output: { type: 'number' },
      name: 'add100',
    });

    const job1 = scheduler.schedule('add', [1, 2, 3, 4]);
    const job2 = scheduler.schedule('add100', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);
    expect(finished).toBe(0);

    job1.output.subscribe();
    expect(started).toBe(1);

    job2.output.subscribe();
    expect(started).toBe(1);  // Job2 starts when Job1 ends.

    expect(finished).toBe(0);

    await Promise.all([
      job1.output.toPromise().then(s => {
        expect(finished).toBe(1);
        expect(s).toBe(10);
      }),
      job2.output.toPromise().then(s => {
        expect(finished).toBe(2);
        expect(s).toBe(115);
      }),
    ]);

    expect(started).toBe(2);
    expect(finished).toBe(2);
  });
});

describe('strategy.reuse()', () => {
  let registry: SimpleJobRegistry;
  let scheduler: SimpleScheduler;

  beforeEach(() => {
    registry = new SimpleJobRegistry();
    scheduler = new SimpleScheduler(registry);
  });

  it('works', async () => {
    let started = 0;
    let finished = 0;

    registry.register(strategy.reuse()(createJobHandler((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      argument: { items: { type: 'number' } },
      output: { type: 'number' },
      name: 'add',
    });

    const job1 = scheduler.schedule('add', [1, 2, 3, 4]);
    const job2 = scheduler.schedule('add', []);
    expect(started).toBe(0);
    expect(finished).toBe(0);

    job1.output.subscribe();
    expect(started).toBe(1);
    expect(finished).toBe(0);

    job2.output.subscribe();
    expect(started).toBe(1);  // job2 is reusing job1.
    expect(finished).toBe(0);

    let result = await job1.output.toPromise();
    expect(result).toBe(10);
    expect(started).toBe(1);
    expect(finished).toBe(1);
    expect(job1.state).toBe(JobState.Ended);
    expect(job2.state).toBe(JobState.Ended);

    const job3 = scheduler.schedule('add', [1, 2, 3, 4, 5]);
    const job4 = scheduler.schedule('add', []);
    job3.output.subscribe();
    expect(started).toBe(2);
    expect(finished).toBe(1);

    job4.output.subscribe();
    expect(started).toBe(2);  // job4 is reusing job3.
    expect(finished).toBe(1);

    result = await job3.output.toPromise();
    expect(result).toBe(15);
    expect(started).toBe(2);
    expect(finished).toBe(2);
    expect(job3.state).toBe(JobState.Ended);
    expect(job4.state).toBe(JobState.Ended);
  });
});

describe('strategy.memoize()', () => {
  let registry: SimpleJobRegistry;
  let scheduler: SimpleScheduler;

  beforeEach(() => {
    registry = new SimpleJobRegistry();
    scheduler = new SimpleScheduler(registry);
  });

  it('works', async () => {
    let started = 0;
    let finished = 0;

    registry.register(strategy.memoize()(createJobHandler((input: number[]) => {
      started++;

      return new Promise<number>(
        resolve => setTimeout(() => {
          finished++;
          resolve(input.reduce((a, c) => a + c, 0));
        }, 10),
      );
    })), {
      argument: { items: { type: 'number' } },
      output: { type: 'number' },
      name: 'add',
    });

    const job1 = scheduler.schedule('add', [1, 2, 3, 4]);
    const job2 = scheduler.schedule('add', [1, 2, 3, 4]);
    const job3 = scheduler.schedule('add', [1, 2, 3, 4, 5]);
    const job4 = scheduler.schedule('add', [1, 2, 3, 4, 5]);
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
      job1.output.toPromise().then(s => {
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(s).toBe(10);
      }),
      job2.output.toPromise().then(s => {
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(job1.state).toBe(JobState.Ended);
        expect(job2.state).toBe(JobState.Ended);
        expect(s).toBe(10);
      }),
      job3.output.toPromise().then(s => {
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(s).toBe(15);
      }),
      job4.output.toPromise().then(s => {
        expect(job3.state).toBe(JobState.Ended);
        expect(job4.state).toBe(JobState.Ended);
        // This is hard since job3 and job1 might finish out of order.
        expect(finished).toBeGreaterThanOrEqual(1);
        expect(s).toBe(15);
      }),
    ]);

    expect(started).toBe(2);
    expect(finished).toBe(2);
  });
});
