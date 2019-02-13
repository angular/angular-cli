/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { schema } from '@angular-devkit/core';
import { timer } from 'rxjs';
import { map, take, tap, toArray } from 'rxjs/operators';
import { TestingArchitectHost } from '../testing/testing-architect-host';
import { BuilderOutput } from './api';
import { Architect } from './architect';
import { createBuilder } from './create-builder';

describe('architect', () => {
  let testArchitectHost: TestingArchitectHost;
  let architect: Architect;
  let called = 0;
  let options: {} = {};
  const target1 = {
    project: 'test',
    target: 'test',
  };
  const target2 = {
    project: 'test',
    target: 'abc',
  };

  beforeEach(async () => {
    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);
    testArchitectHost = new TestingArchitectHost();
    architect = new Architect(testArchitectHost, registry);

    called = 0;
    testArchitectHost.addBuilder('package:test', createBuilder(async () => {
      called++;

      return new Promise<BuilderOutput>(resolve => {
        setTimeout(() => resolve({ success: true }), 10);
      });
    }));
    testArchitectHost.addBuilder('package:test-options', createBuilder(o => {
      options = o;

      return { success: true };
    }));

    testArchitectHost.addTarget(target1, 'package:test');
    testArchitectHost.addTarget(target2, 'package:test');
  });

  it('works', async () => {
    testArchitectHost.addBuilder('package:test', createBuilder(() => ({ success: true })));

    const run = await architect.scheduleBuilder('package:test', {});
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    await run.stop();
  });

  it('works with async builders', async () => {
    testArchitectHost.addBuilder('package:test', createBuilder(async () => ({ success: true })));

    const run = await architect.scheduleBuilder('package:test', {});
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    await run.stop();
  });

  it('runs builders parallel', async () => {
    const run = await architect.scheduleBuilder('package:test', {});
    const run2 = await architect.scheduleBuilder('package:test', {});
    expect(called).toBe(2);
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(await run2.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(called).toBe(2);
    await run.stop();
  });

  it('runs targets parallel', async () => {
    const run = await architect.scheduleTarget(target1, {});
    const run2 = await architect.scheduleTarget(target1, {});
    expect(called).toBe(2);
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(await run2.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(called).toBe(2);
    await run.stop();
  });

  it('passes options to builders', async () => {
    const o = { hello: 'world' };
    const run = await architect.scheduleBuilder('package:test-options', o);
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(options).toEqual(o);
  });

  it('passes options to targets', async () => {
    const o = { hello: 'world' };
    const run = await architect.scheduleTarget(target1, o);
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(options).toEqual(o);
  });

  it('errors when builder cannot be resolved', async () => {
    try {
      await architect.scheduleBuilder('non:existent', {});
      expect('to throw').not.toEqual('to throw');
    } catch {
    }
  });

  it('works with watching builders', async () => {
    let results = 0;
    testArchitectHost.addBuilder('package:test-watch', createBuilder((_, context) => {
      called++;

      return timer(10, 10).pipe(
        take(10),
        map(() => {
          context.reportRunning();

          return { success: true };
        }),
        tap(() => results++),
      );
    }));

    const run = await architect.scheduleBuilder('package:test-watch', {});
    await run.result;
    expect(called).toBe(1);
    expect(results).toBe(1);

    const all = await run.output.pipe(toArray()).toPromise();
    expect(called).toBe(1);
    expect(results).toBe(10);
    expect(all.length).toBe(10);
  });
});
