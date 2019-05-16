/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function no-non-null-assertion
import { EMPTY, Observable, of, timer } from 'rxjs';
import { map, take, toArray } from 'rxjs/operators';
import { JobHandlerContext, JobOutboundMessage, JobOutboundMessageKind, JobState } from './api';
import { createJobHandler } from './create-job-handler';
import { SimpleJobRegistry } from './simple-registry';
import { SimpleScheduler } from './simple-scheduler';

describe('SimpleScheduler', () => {
  let registry: SimpleJobRegistry;
  let scheduler: SimpleScheduler;

  beforeEach(() => {
    registry = new SimpleJobRegistry();
    scheduler = new SimpleScheduler(registry);
  });

  it('works for a simple case', async () => {
    registry.register(
      'add', createJobHandler((arg: number[]) => arg.reduce((a, c) => a + c, 0)), {
        argument: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    const sum = await (scheduler.schedule('add', [1, 2, 3, 4])).output.toPromise();
    expect(sum).toBe(10);
  });

  it('calls jobs in parallel', async () => {
    let started = 0;
    let finished = 0;

    registry.register(
      'add',
      createJobHandler((argument: number[]) => {
        started++;

        return new Promise<number>(
          resolve => setTimeout(() => {
            finished++;
            resolve(argument.reduce((a, c) => a + c, 0));
          }, 10),
        );
      }),
      {
        argument: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    const job1 = scheduler.schedule('add', [1, 2, 3, 4]);
    const job2 = scheduler.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);

    const p1 = job1.output.toPromise();
    expect(started).toBe(1);

    const p2 = job2.output.toPromise();
    expect(started).toBe(2);
    expect(finished).toBe(0);

    const [sum, sum2] = await Promise.all([p1, p2]);
    expect(started).toBe(2);
    expect(finished).toBe(2);

    expect(sum).toBe(10);
    expect(sum2).toBe(15);
  });

  it('validates arguments', async () => {
    registry.register(
      'add', createJobHandler((arg: number[]) => arg.reduce((a, c) => a + c, 0)), {
        argument: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    await (scheduler.schedule('add', [1, 2, 3, 4])).output.toPromise();
    try {
      await (scheduler.schedule('add', ['1', 2, 3, 4])).output.toPromise();
      expect(true).toBe(false);
    } catch (e) {
      // TODO: enable this when https://github.com/bazelbuild/rules_typescript/commit/37807e2c4
      // is released, otherwise this breaks because bazel downgrade to ES5 which does not support
      // extending Error.
      // expect(e instanceof JobInboundMessageSchemaValidationError).toBe(true);
      expect(e.message).toMatch(/"\[0\]".*number/);
    }
  });

  it('validates outputs', async () => {
    registry.register(
      'add', createJobHandler(() => 'hello world'), {
        output: { type: 'number' },
      },
    );

    try {
      await (scheduler.schedule('add', [1, 2, 3, 4])).output.toPromise();
      expect(true).toBe(false);
    } catch (e) {
      // TODO: enable this when https://github.com/bazelbuild/rules_typescript/commit/37807e2c4
      // is released, otherwise this breaks because bazel downgrade to ES5 which does not support
      // extending Error.
      // expect(e instanceof JobOutputSchemaValidationError).toBe(true);
      expect(e.message).toMatch(/"".*number/);
    }
  });

  it('works with dependencies', async () => {
    const done: number[] = [];

    registry.register(
      'job',
      createJobHandler<number, number, number>((argument) => {
        return new Promise(resolve => setImmediate(() => {
          done.push(argument);
          resolve(argument);
        }));
      }),
      { argument: true, output: true },
    );

    // Run jobs.
    const job1 = scheduler.schedule('job', 1);
    const job2 = scheduler.schedule('job', 2);
    const job3 = scheduler.schedule('job', 3);

    // Run a job to wait for 1.
    const job4 = scheduler.schedule('job', 4, { dependencies: job1 });

    // Run a job to wait for 2.
    const job5 = scheduler.schedule('job', 5, { dependencies: job2 });

    // Run a job to wait for 3.
    const job6 = scheduler.schedule('job', 6, { dependencies: job3 });

    // Run a job to wait for 4, 5 and 6.
    const job7 = scheduler.schedule('job', 7, { dependencies: [job4, job5, job6] });

    expect(done.length).toBe(0);

    await job1.output.toPromise();
    expect(done).toContain(1);
    expect(done).not.toContain(4);
    expect(done).not.toContain(7);

    await job5.output.toPromise();
    expect(done).toContain(1);
    expect(done).toContain(2);
    expect(done).not.toContain(4);
    expect(done).toContain(5);
    expect(done).not.toContain(7);

    await job7.output.toPromise();
    expect(done.length).toBe(7);
    // Might be out of order.
    expect(done).toEqual(jasmine.arrayContaining([1, 2, 3, 4, 5, 6, 7]));
    // Verify at least partial order.
    expect(done[done.length - 1]).toBe(7);
    expect(done.indexOf(4)).toBeGreaterThan(done.indexOf(1));
    expect(done.indexOf(5)).toBeGreaterThan(done.indexOf(2));
    expect(done.indexOf(6)).toBeGreaterThan(done.indexOf(3));
  });

  it('does not start dependencies until the last one is subscribed to', async () => {
    // This test creates the following graph of dependencies:
    //     1  <-.--  2  <-.--  4  <-.---------.--  6
    //                    +--  3  <-+--  5  <-'
    // Which can result only in the execution orders: [1, 2, 3, 4, 5, 6]
    // Only subscribe to the last one.

    const started: number[] = [];
    const done: number[] = [];

    registry.register(
      'job',
      createJobHandler<number, number, number>((argument: number) => {
        started.push(argument);

        return new Promise(resolve => setImmediate(() => {
          done.push(argument);
          resolve(argument);
        }));
      }),
      { argument: true, output: true },
    );

    // Run jobs.
    const job1 = scheduler.schedule('job', 1);
    const job2 = scheduler.schedule('job', 2, { dependencies: job1 });
    const job3 = scheduler.schedule('job', 3, { dependencies: job2 });
    const job4 = scheduler.schedule('job', 4, { dependencies: [job2, job3] });
    const job5 = scheduler.schedule('job', 5, { dependencies: [job1, job2, job4] });
    const job6 = scheduler.schedule('job', 6, { dependencies: [job4, job5] });

    // Just subscribe to the last job in the lot.
    job6.outboundBus.subscribe();
    // Expect the first one to start.
    expect(started).toEqual([1]);
    // Wait for the first one to finish.
    await job1.output.toPromise();
    // Expect the second one to have started, and the first one to be done.
    expect(started).toEqual([1, 2]);
    expect(done).toEqual([1]);

    // Rinse and repeat.
    await job2.output.toPromise();
    expect(started).toEqual([1, 2, 3]);
    expect(done).toEqual([1, 2]);

    await job3.output.toPromise();
    expect(started).toEqual([1, 2, 3, 4]);
    expect(done).toEqual([1, 2, 3]);

    await job4.output.toPromise();
    expect(started).toEqual([1, 2, 3, 4, 5]);
    expect(done).toEqual([1, 2, 3, 4]);

    // Just skip job 5.
    await job6.output.toPromise();
    expect(done).toEqual(started);
  });

  it('can be paused', async () => {
    let resume: (() => void) | null = null;

    registry.register(
      'job',
      createJobHandler((argument, context) => {
        return Promise.resolve()
          .then(() => {
            expect(resume).toBeNull();
            resume = context.scheduler.pause();
          })
          .then(() => argument);
      }),
    );

    // Run the job once. Wait for it to finish. We should have a `resume()` and the scheduler will
    // be paused.
    const p0 = (scheduler.schedule('job', 0)).output.toPromise();
    expect(await p0).toBe(0);

    // This will wait.
    const p1 = (scheduler.schedule('job', 1)).output.toPromise();
    await Promise.resolve();

    expect(resume).not.toBeNull();
    resume !();
    resume = null;

    // Running p1.
    expect(await p1).toBe(1);
    expect(resume).not.toBeNull();

    const p2 = (scheduler.schedule('job', 2)).output.toPromise();

    await Promise.resolve();
    resume !();
    resume = null;
    expect(await p2).toBe(2);
    expect(resume).not.toBeNull();

    resume !();
    // Should not error since all jobs have run.
    await Promise.resolve();
  });

  it('can be paused (multiple)', async () => {
    const done: number[] = [];

    registry.register(
      'jobA',
      createJobHandler((argument: number) => {
        done.push(argument);

        return Promise.resolve()
          .then(() => argument);
      }),
    );

    // Pause manually.
    const resume = scheduler.pause();
    const p10 = (scheduler.schedule('jobA', 10)).output.toPromise();
    const p11 = (scheduler.schedule('jobA', 11)).output.toPromise();
    const p12 = (scheduler.schedule('jobA', 12)).output.toPromise();
    await Promise.resolve();

    expect(done).toEqual([]);
    resume();
    await Promise.resolve();
    expect(done).not.toEqual([]);
    expect(await p10).toBe(10);
    expect(await p11).toBe(11);
    expect(await p12).toBe(12);
    expect(done).toEqual([10, 11, 12]);
  });

  it('can be cancelled by unsubscribing from the raw output', async () => {
    const done: number[] = [];
    const resolves: (() => void)[] = [];
    let keepGoing = true;

    registry.register(
      'job',
      createJobHandler((argument: number) => {
        return new Observable<number>(observer => {
          function fn() {
            if (keepGoing) {
              const p = new Promise(r => resolves.push(r));

              observer.next(argument);
              done.push(argument);
              argument++;

              // tslint:disable-next-line:no-floating-promises
              p.then(fn);
            } else {
              done.push(-1);
              observer.complete();
            }
          }

          setImmediate(fn);

          return () => {
            keepGoing = false;
          };
        });
      }),
    );

    const job = scheduler.schedule('job', 0);
    await new Promise(r => setTimeout(r, 10));
    expect(job.state).toBe(JobState.Queued);
    const subscription = job.output.subscribe();

    await new Promise(r => setTimeout(r, 10));
    expect(job.state).toBe(JobState.Started);
    expect(done).toEqual([0]);
    expect(resolves.length).toBe(1);
    resolves[0]();

    await new Promise(r => setTimeout(r, 10));
    expect(done).toEqual([0, 1]);
    expect(resolves.length).toBe(2);
    resolves[1]();

    await new Promise(r => setTimeout(r, 10));
    expect(done).toEqual([0, 1, 2]);
    expect(resolves.length).toBe(3);
    subscription.unsubscribe();
    resolves[2]();

    job.stop();
    await job.output.toPromise();
    expect(keepGoing).toBe(false);
    expect(done).toEqual([0, 1, 2, -1]);
    expect(job.state).toBe(JobState.Ended);
  });

  it('sequences raw outputs properly for all use cases', async () => {
    registry.register('job-sync', createJobHandler<number, number, number>(arg => arg + 1));
    registry.register('job-promise', createJobHandler<number, number, number>(arg => {
      return Promise.resolve(arg + 1);
    }));
    registry.register('job-obs-sync', createJobHandler<number, number, number>(arg => of(arg + 1)));
    registry.register('job-obs-async', createJobHandler<number, number, number>(arg => {
      return timer(1).pipe(
        take(3),
        take(1),
        map(() => arg + 1),
      );
    }));

    const job1 = scheduler.schedule('job-sync', 100);
    const job1OutboundBus = await job1.outboundBus.pipe(
      // Descriptions are going to differ, so get rid of those.
      map(x => ({ ...x, description: null })),
      toArray(),
    ).toPromise();

    const job2 = scheduler.schedule('job-promise', 100);
    const job2OutboundBus = await job2.outboundBus.pipe(
      // Descriptions are going to differ, so get rid of those.
      map(x => ({ ...x, description: null })),
      toArray(),
    ).toPromise();

    const job3 = scheduler.schedule('job-obs-sync', 100);
    const job3OutboundBus = await job3.outboundBus.pipe(
      // Descriptions are going to differ, so get rid of those.
      map(x => ({ ...x, description: null })),
      toArray(),
    ).toPromise();

    const job4 = scheduler.schedule('job-obs-async', 100);
    const job4OutboundBus = await job4.outboundBus.pipe(
      // Descriptions are going to differ, so get rid of those.
      map(x => ({ ...x, description: null })),
      toArray(),
    ).toPromise();

    // The should all report the same stuff.
    expect(job1OutboundBus).toEqual(job4OutboundBus);
    expect(job2OutboundBus).toEqual(job4OutboundBus);
    expect(job3OutboundBus).toEqual(job4OutboundBus);
  });

  describe('channels', () => {
    it('works', async () => {
      registry.register(
        'job',
        createJobHandler<number, number, number>((argument, context) => {
          const channel = context.createChannel('any');
          channel.next('hello world');
          channel.complete();

          return 0;
        }),
      );

      const job = scheduler.schedule('job', 0);
      let sideValue = '';
      const c = job.getChannel('any') as Observable<string>;
      c.subscribe(x => sideValue = x);

      expect(await job.output.toPromise()).toBe(0);
      expect(sideValue).toBe('hello world');
    });

    it('validates', async () => {
      registry.register(
        'job',
        createJobHandler<number, number, number>((argument, context) => {
          const channel = context.createChannel('any');
          channel.next('hello world');
          channel.complete();

          return 0;
        }), {
          argument: true,
          output: true,
        },
      );

      const job = scheduler.schedule('job', 0);
      let sideValue = '';
      const c = job.getChannel('any', { type: 'number' }) as Observable<string>;
      expect(c).toBeDefined(null);

      if (c) {
        c.subscribe(x => sideValue = x);
      }

      expect(await job.output.toPromise()).toBe(0);
      expect(sideValue).not.toBe('hello world');
    });
  });

  describe('lifecycle messages', () => {
    it('sequences double start once', async () => {
      const fn = (_: never, { description }: JobHandlerContext) => {
        return new Observable<JobOutboundMessage<never>>(observer => {
          observer.next({ kind: JobOutboundMessageKind.Start, description });
          observer.next({ kind: JobOutboundMessageKind.Start, description });
          observer.next({ kind: JobOutboundMessageKind.End, description });
          observer.complete();
        });
      };

      registry.register('job', Object.assign(fn, { jobDescription: {} }));
      const allOutput = await scheduler.schedule('job', 0).outboundBus.pipe(
        toArray(),
      ).toPromise();

      expect(allOutput.map(x => ({ ...x, description: null }))).toEqual([
        { kind: JobOutboundMessageKind.OnReady, description: null },
        { kind: JobOutboundMessageKind.Start, description: null },
        { kind: JobOutboundMessageKind.End, description: null },
      ]);
    });

    it('add an End if there is not one', async () => {
      const fn = () => EMPTY;

      registry.register('job', Object.assign(fn, { jobDescription: {} }));
      const allOutput = await scheduler.schedule('job', 0).outboundBus.pipe(
        toArray(),
      ).toPromise();

      expect(allOutput.map(x => ({ ...x, description: null }))).toEqual([
        { kind: JobOutboundMessageKind.OnReady, description: null },
        { kind: JobOutboundMessageKind.End, description: null },
      ]);
    });

    it('only one End', async () => {
      const fn = (_: never, { description }: JobHandlerContext) => {
        return new Observable<JobOutboundMessage<never>>(observer => {
          observer.next({ kind: JobOutboundMessageKind.End, description });
          observer.next({ kind: JobOutboundMessageKind.End, description });
          observer.complete();
        });
      };

      registry.register('job', Object.assign(fn, { jobDescription: {} }));
      const allOutput = await scheduler.schedule('job', 0).outboundBus.pipe(
        toArray(),
      ).toPromise();

      expect(allOutput.map(x => ({ ...x, description: null }))).toEqual([
        { kind: JobOutboundMessageKind.OnReady, description: null },
        { kind: JobOutboundMessageKind.End, description: null },
      ]);
    });
  });

  describe('input', () => {
    it('works', async () => {
      registry.register(
        'job',
        createJobHandler<number, number, number>((argument, context) => {
          return new Observable<number>(subscriber => {
            context.input.subscribe(x => {
              if (x === null) {
                subscriber.complete();
              } else {
                subscriber.next(parseInt('' + x) + argument);
              }
            });
          });
        }),
      );

      const job = scheduler.schedule('job', 100);
      const outputs: number[] = [];

      job.output.subscribe(x => outputs.push(x as number));

      job.input.next(1);
      job.input.next('2');
      job.input.next(3);
      job.input.next(null);

      expect(await job.output.toPromise()).toBe(103);
      expect(outputs).toEqual([101, 102, 103]);
    });

    it('validates', async () => {
      const handler = createJobHandler<number, number, number>((argument, context) => {
        return new Observable<number>(subscriber => {
          context.input.subscribe(x => {
            if (x === null) {
              subscriber.complete();
            } else {
              subscriber.next(parseInt('' + x) + argument);
            }
          });
        });
      }, {
        input: { anyOf: [{ type: 'number' }, { type: 'null' }] },
      });

      registry.register('job', handler);

      const job = scheduler.schedule('job', 100);
      const outputs: number[] = [];

      job.output.subscribe(x => outputs.push(x as number));

      job.input.next(1);
      job.input.next('2');
      job.input.next(3);
      job.input.next(null);

      expect(await job.output.toPromise()).toBe(103);
      expect(outputs).toEqual([101, 103]);
    });

    it('works deferred', async () => {
      // This is a more complex test. The job returns an output deferred from the input
      registry.register(
        'job',
        createJobHandler<number, number, number>((argument, context) => {
          return new Observable<number>(subscriber => {
            context.input.subscribe(x => {
              if (x === null) {
                setTimeout(() => subscriber.complete(), 10);
              } else {
                setTimeout(() => subscriber.next(parseInt('' + x) + argument), x);
              }
            });
          });
        }),
      );

      const job = scheduler.schedule('job', 100);
      const outputs: number[] = [];

      job.output.subscribe(x => outputs.push(x as number));

      job.input.next(1);
      job.input.next(2);
      job.input.next(3);
      job.input.next(null);

      expect(await job.output.toPromise()).toBe(103);
      expect(outputs).toEqual(jasmine.arrayWithExactContents([101, 102, 103]));
    });
  });

  it('propagates errors', async () => {
    registry.register('job', createJobHandler(() => { throw 1; }));
    const job = scheduler.schedule('job', 0);

    try {
      await job.output.toPromise();
      expect('THE ABOVE LINE SHOULD NOT ERROR').toBe('false');
    } catch (error) {
      expect(error).toBe(1);
    }
  });
});
