/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { schema } from '../json';
import { JobStrategy } from './api';
import { makeJobHandler } from './helpers';
import { SimpleJobRegistry } from './registry';

describe('SimpleJobRegistry', () => {
  it('works for a simple case', done => {
    const registry = new SimpleJobRegistry();

    registry.registerType('add', { items: { type: 'number' } }, { type: 'number' });
    registry.register(
      'addN', 'add', makeJobHandler((input: number[]) => input.reduce((a, c) => a + c, 0)),
    );

    registry.schedule('add', [1, 2, 3, 4])
      .output
      .then(sum => {
        expect(sum).toBe(10);
      })
      .then(done, done.fail);
  });

  it('works for parallel jobs', done => {
    const registry = new SimpleJobRegistry();

    registry.registerType(
      'add',
      { items: { type: 'number' } },
      { type: 'number' },
    );

    let started = 0;
    let finished = 0;

    registry.register(
      'addN', 'add',
      makeJobHandler((input: number[]) => {
        started++;

        return new Promise<number>(
          resolve => setTimeout(() => {
            finished++;
            resolve(input.reduce((a, c) => a + c, 0));
          }, 10),
        );
      }),
      { strategy: JobStrategy.Parallelize },
    );

    const job1 = registry.schedule('add', [1, 2, 3, 4]);
    const job2 = registry.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);

    job1.subscribe();
    expect(started).toBe(1);

    job2.subscribe();
    expect(started).toBe(2);
    expect(finished).toBe(0);

    Promise.all([job1.output, job2.output])
      .then(([sum, sum2]) => {
        expect(started).toBe(2);
        expect(finished).toBe(2);

        expect(sum).toBe(10);
        expect(sum2).toBe(15);
      })
      .then(done, done.fail);
  });

  it('works for serial jobs', done => {
    const registry = new SimpleJobRegistry();

    registry.registerType('add', {
      items: { type: 'number' } as schema.JsonSchema,
    }, {
      type: 'number',
    } as schema.JsonSchema);

    let started = 0;
    let finished = 0;

    registry.register(
      'addN', 'add',
      makeJobHandler((input: number[]) => {
        started++;

        return new Promise<number>(
          resolve => setTimeout(() => {
            finished++;
            resolve(input.reduce((a, c) => a + c, 0));
          }, 10),
        );
      }),
      { strategy: JobStrategy.Serialize },
    );

    const job1 = registry.schedule('add', [1, 2, 3, 4]);
    const job2 = registry.schedule('add', [1, 2, 3, 4, 5]);
    expect(started).toBe(0);

    job1.subscribe();
    expect(started).toBe(1);

    job2.subscribe();
    expect(started).toBe(1);  // Job2 starts when Job1 ends.

    expect(finished).toBe(0);

    Promise.all([
      job1.output.then(s => {
        expect(finished).toBe(1);

        return s;
      }),
      job2.output.then(s => {
        expect(finished).toBe(2);

        return s;
      }),
    ])
      .then(([sum, sum2]) => {
        expect(started).toBe(2);
        expect(finished).toBe(2);

        expect(sum).toBe(10);
        expect(sum2).toBe(15);
      })
      .then(done, done.fail);
  });
});
