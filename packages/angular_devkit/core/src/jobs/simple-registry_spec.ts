/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { Observable } from 'rxjs';
import { createJob } from './create-job';
import { SimpleJobRegistry } from './simple-registry';

describe('SimpleJobRegistry', () => {
  it('works for a simple case', async () => {
    const registry = new SimpleJobRegistry();

    registry.register(
      'add', createJob((input: number[]) => input.reduce((a, c) => a + c, 0)), {
        input: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    const sum = await registry.schedule('add', [1, 2, 3, 4]).promise;
    expect(sum).toBe(10);
  });

  it('calls jobs in parallel', async () => {
    const registry = new SimpleJobRegistry();

    let started = 0;
    let finished = 0;

    registry.register(
      'add',
      createJob((input: number[]) => {
        started++;

        return new Promise<number>(
          resolve => setTimeout(() => {
            finished++;
            resolve(input.reduce((a, c) => a + c, 0));
          }, 10),
        );
      }),
      {
        input: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    const job1 = registry.schedule('add', [1, 2, 3, 4]);
    const job2 = registry.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);

    const p1 = job1.promise;
    expect(started).toBe(1);

    const p2 = job2.promise;
    expect(started).toBe(2);
    expect(finished).toBe(0);

    const [sum, sum2] = await Promise.all([p1, p2]);
    expect(started).toBe(2);
    expect(finished).toBe(2);

    expect(sum).toBe(10);
    expect(sum2).toBe(15);
  });

  it('validates inputs', async () => {
    const registry = new SimpleJobRegistry();

    registry.register(
      'add', createJob((input: number[]) => input.reduce((a, c) => a + c, 0)), {
        input: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );

    await registry.schedule('add', [1, 2, 3, 4]).promise;
    try {
      await registry.schedule('add', ['1', 2, 3, 4]).promise;
      expect(true).toBe(false);
    } catch {}
  });

  it('validates outputs', async () => {
    const registry = new SimpleJobRegistry();

    registry.register(
      'add', createJob(() => 'hello world'), {
        input: true,
        output: { type: 'number' },
      },
    );

    try {
      await registry.schedule('add', [1, 2, 3, 4]).promise;
      expect(true).toBe(false);
    } catch {}
  });

  it('allows extensions', async () => {
    const registry = new SimpleJobRegistry();

    registry.register(
      'add', createJob((input: number[]) => input.reduce((a, c) => a + c, 0)), {
        input: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );
    registry.register(
      'add1', createJob((input: number[]) => input.reduce((a, c) => a + c + 1, 0)), {
        extends: 'add',
      },
    );

    expect(await registry.schedule('add', [1, 2, 3, 4]).promise).toBe(10);
    expect(await registry.schedule('add1', [1, 2, 3, 4]).promise).toBe(14);
  });

  it('validates inputs with extensions', async () => {
    const registry = new SimpleJobRegistry();

    registry.register(
      'add', createJob((input: number[]) => input.reduce((a, c) => a + c, 0)), {
        input: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );
    registry.register(
      'add1', createJob((input: number[]) => input.reduce((a, c) => a + c + 1, 0)), {
        extends: 'add',
      },
    );

    await registry.schedule('add1', [1, 2, 3, 4]).promise;
    try {
      await registry.schedule('add1', ['1', 2, 3, 4]).promise;
      expect(true).toBe(false);
    } catch {}
  });

  it('validates outputs with extensions', async () => {
    const registry = new SimpleJobRegistry();

    registry.register(
      'add', createJob((input: number[]) => input.reduce((a, c) => a + c, 0)), {
        input: { items: { type: 'number' } },
        output: { type: 'number' },
      },
    );
    registry.register(
      'add1', createJob(() => 'hello world'), {
        extends: 'add',
      },
    );

    await registry.schedule('add', [1, 2, 3, 4]).promise;
    try {
      await registry.schedule('add1', [1, 2, 3, 4]).promise;
      expect(true).toBe(false);
    } catch {}
  });

  describe('channels', () => {
    it('works', async () => {
      const registry = new SimpleJobRegistry();

      registry.register(
        'job',
        createJob<number, number>((input, context) => {
          context.channels['any'].next('hello world');

          return 0;
        }), {
          input: true,
          output: true,
          channels: {
            'any': true,
          },
        },
      );

      const job = registry.schedule('job', 0);
      let sideValue = '';
      const c = job.channels['any'] as Observable<string>;
      expect(c).toBeDefined(null);

      if (c) {
        c.subscribe(x => sideValue = x);
      }

      expect(await job.promise).toBe(0);
      expect(sideValue).toBe('hello world');
    });

    // Disabling this test as this logic is not implemented in simple registry yet.
    xit('validates', async () => {
      const registry = new SimpleJobRegistry();

      registry.register(
        'job',
        createJob<number, number>((input, context) => {
          context.channels['any'].next('hello world');

          return 0;
        }), {
          input: true,
          output: true,
          channels: {
            'any': { type: 'number' },
          },
        },
      );

      const job = registry.schedule('job', 0);
      let sideValue = '';
      const c = job.channels['any'] as Observable<string>;
      expect(c).toBeDefined(null);

      if (c) {
        c.subscribe(x => sideValue = x);
      }

      expect(await job.promise).toBe(0);
      expect(sideValue).not.toBe('hello world');
    });
  });

  describe('inputChannel', () => {
    it('works', async () => {
      const registry = new SimpleJobRegistry();

      registry.register(
        'job',
        createJob<number, number>((input, context) => {
          return new Observable<number>(subscriber => {
            context.inputChannel.subscribe(x => {
              if (x === null) {
                subscriber.complete();
              } else {
                subscriber.next(parseInt('' + x) + input);
              }
            });
          });
        }), {
          input: true,
          output: true,
        },
      );

      const job = registry.schedule<number, number>('job', 100);
      const outputs: number[] = [];

      job.output.subscribe(x => outputs.push(x));

      job.input.next(1);
      job.input.next(2);
      job.input.next(3);
      job.input.next(null);

      expect(await job.promise).toBe(103);
      expect(outputs).toEqual([101, 102, 103]);
    });
  });
});
