/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json, schema } from '@angular-devkit/core';
import { timer } from 'rxjs';
import { map, take, tap, toArray } from 'rxjs/operators';
import { TestingArchitectHost } from '../testing/testing-architect-host';
import { BuilderOutput, BuilderRun } from './api';
import { Architect } from './architect';
import { createBuilder } from './create-builder';

// tslint:disable-next-line:no-big-function
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

    options = {};
    called = 0;
    testArchitectHost.addBuilder('package:test', createBuilder(async o => {
      called++;
      options = o;

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
    const o = { helloBuilder: 'world' };
    const run = await architect.scheduleBuilder('package:test-options', o);
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(options).toEqual(o);
    await run.stop();
  });

  it('passes options to targets', async () => {
    const o = { helloTarget: 'world' };
    const run = await architect.scheduleTarget(target1, o);
    expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
    expect(options).toEqual(o);
    await run.stop();
  });

  it(`errors when target configuration doesn't exists`, async () => {
    try {
      await architect.scheduleBuilder('test:test:invalid', {});
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.message).toContain('Job name "test:test:invalid" does not exist.');
    }
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

  it('reports errors in the builder', async () => {
    testArchitectHost.addBuilder('package:error', createBuilder(() => {
      throw new Error('Error in the builder.');
    }));

    let run: BuilderRun | undefined = undefined;
    try {
      try {
        // This should not throw.
        run = await architect.scheduleBuilder('package:error', {});
      } catch (err) {
        expect(err).toBeUndefined();
        throw err;
      }

      // This should throw.
      await run.result;
      expect('to throw').not.toEqual('to throw');
    } catch {
    }
    if (run) {
      await run.stop();
    }
  });

  it('reports errors in the builder (async)', async () => {
    testArchitectHost.addBuilder('package:error', createBuilder(() => {
      return Promise.reject(new Error('Error async'));
    }));

    let run: BuilderRun | undefined = undefined;
    try {
      try {
        // This should not throw.
        run = await architect.scheduleBuilder('package:error', {});
      } catch (err) {
        expect(err).toBeUndefined();
        throw err;
      }

      // This should throw.
      await run.result;
      expect('to throw').not.toEqual('to throw');
    } catch {
    }
    if (run) {
      await run.stop();
    }
  });

  it('reports errors in options', async () => {
    const builderName = 'options:error';
    const builder = createBuilder(() => ({ success: true }));
    const optionSchema = { type: 'object', additionalProperties: false };
    testArchitectHost.addBuilder(builderName, builder, '', optionSchema);

    const run = await architect.scheduleBuilder(builderName, { extraProp: true });
    await expectAsync(run.result).toBeRejectedWith(
      jasmine.objectContaining({ message: jasmine.stringMatching('extraProp') }));
    await run.stop();
  });

  it('exposes getTargetOptions() properly', async () => {
    const goldenOptions = {
      value: 'value',
    };
    let options = {} as object;

    const target = {
      project: 'project',
      target: 'target',
    };
    testArchitectHost.addTarget(target, 'package:target', goldenOptions);

    testArchitectHost.addBuilder('package:getTargetOptions', createBuilder(async (_, context) => {
      options = await context.getTargetOptions(target);

      return { success: true };
    }));

    const run = await architect.scheduleBuilder('package:getTargetOptions', {});
    const output = await run.output.toPromise();
    expect(output.success).toBe(true);
    expect(options).toEqual(goldenOptions);
    await run.stop();

    // Use an invalid target and check for error.
    target.target = 'invalid';
    options = {};

    // This should not error.
    const run2 = await architect.scheduleBuilder('package:getTargetOptions', {});

    // But this should.
    try {
      await run2.output.toPromise();
      expect('THE ABOVE LINE SHOULD NOT ERROR').toBe('false');
    } catch {}
    await run2.stop();
  });

  it('exposes getBuilderNameForTarget()', async () => {
    const builderName = 'ImBlue:DabadeeDabada';
    testArchitectHost.addBuilder(builderName, createBuilder(() => ({ success: true })));

    const target = {
      project: 'some-project',
      target: 'some-target',
    };
    testArchitectHost.addTarget(target, builderName);

    let actualBuilderName = '';
    testArchitectHost.addBuilder('package:do-it', createBuilder(async (_, context) => {
      actualBuilderName = await context.getBuilderNameForTarget(target);

      return { success: true };
    }));

    const run = await architect.scheduleBuilder('package:do-it', {});
    const output = await run.output.toPromise();
    expect(output.success).toBe(true);
    expect(actualBuilderName).toEqual(builderName);
    await run.stop();

    // Use an invalid target and check for error.
    target.target = 'invalid';
    actualBuilderName = '';

    // This should not error.
    const run2 = await architect.scheduleBuilder('package:do-it', {});

    // But this should.
    try {
      await run2.output.toPromise();
      expect('THE ABOVE LINE SHOULD NOT ERROR').toBe('false');
    } catch {}
    await run2.stop();
  });

  it('exposes validateOptions()', async () => {
    const builderName = 'Hello:World';
    testArchitectHost.addBuilder(builderName, createBuilder(() => ({ success: true })), '', {
      type: 'object',
      properties: {
        p0: { type: 'number', default: 123 },
        p1: { type: 'string' },
      },
      required: [
        'p1',
      ],
    });

    let actualOptions: json.JsonObject = {};
    testArchitectHost.addBuilder('package:do-it', createBuilder(async (options, context) => {
      actualOptions = await context.validateOptions(options, builderName);

      return { success: true };
    }));

    const run = await architect.scheduleBuilder('package:do-it', { p1: 'hello' });
    const output = await run.output.toPromise();
    expect(output.success).toBe(true);
    expect(actualOptions).toEqual({
      p0: 123,
      p1: 'hello',
    });
    await run.stop();

    // Should also error.
    const run2 = await architect.scheduleBuilder('package:do-it', {});

    await expectAsync(run2.output.toPromise())
      .toBeRejectedWith(jasmine.objectContaining({ message: jasmine.stringMatching('p1')}));

    await run2.stop();
  });
});
