/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-extraneous-dependencies */

import { TestProjectHost } from '@angular-devkit/architect/testing';
import { BuilderHarness } from './builder-harness';

describe('BuilderHarness', () => {
  let mockHost: TestProjectHost;

  beforeEach(() => {
    mockHost = jasmine.createSpyObj('TestProjectHost', ['root']);
    (mockHost.root as jasmine.Spy).and.returnValue('.');
  });

  it('uses the provided builder handler', async () => {
    const mockHandler = jasmine.createSpy().and.returnValue({ success: true });

    const harness = new BuilderHarness(mockHandler, mockHost);

    await harness.executeOnce();

    expect(mockHandler).toHaveBeenCalled();
  });

  it('provides the builder output result when executing', async () => {
    const mockHandler = jasmine.createSpy().and.returnValue({ success: false, property: 'value' });

    const harness = new BuilderHarness(mockHandler, mockHost);
    const { result } = await harness.executeOnce();

    expect(result).toBeDefined();
    expect(result?.success).toBeFalse();
    expect(result?.property).toBe('value');
  });

  it('does not show builder logs on console when a builder succeeds', async () => {
    const consoleErrorMock = spyOn(console, 'error');

    const harness = new BuilderHarness(async (_, context) => {
      context.logger.warn('TEST WARNING');

      return { success: true };
    }, mockHost);

    const { result } = await harness.executeOnce();

    expect(result).toBeDefined();
    expect(result?.success).toBeTrue();

    expect(consoleErrorMock).not.toHaveBeenCalledWith(jasmine.stringMatching('TEST WARNING'));
  });

  it('shows builder logs on console when a builder fails', async () => {
    const consoleErrorMock = spyOn(console, 'error');

    const harness = new BuilderHarness(async (_, context) => {
      context.logger.warn('TEST WARNING');

      return { success: false };
    }, mockHost);

    const { result } = await harness.executeOnce();

    expect(result).toBeDefined();
    expect(result?.success).toBeFalse();

    expect(consoleErrorMock).toHaveBeenCalledWith(jasmine.stringMatching('TEST WARNING'));
  });

  it('does not show builder logs on console when a builder fails and outputLogsOnFailure: false', async () => {
    const consoleErrorMock = spyOn(console, 'error');

    const harness = new BuilderHarness(async (_, context) => {
      context.logger.warn('TEST WARNING');

      return { success: false };
    }, mockHost);

    const { result } = await harness.executeOnce({ outputLogsOnFailure: false });

    expect(result).toBeDefined();
    expect(result?.success).toBeFalse();

    expect(consoleErrorMock).not.toHaveBeenCalledWith(jasmine.stringMatching('TEST WARNING'));
  });

  it('provides and logs the builder output exception when builder throws', async () => {
    const mockHandler = jasmine.createSpy().and.throwError(new Error('Builder Error'));
    const consoleErrorMock = spyOn(console, 'error');

    const harness = new BuilderHarness(mockHandler, mockHost);
    const { result, error } = await harness.executeOnce();

    expect(result).toBeUndefined();
    expect(error).toEqual(jasmine.objectContaining({ message: 'Builder Error' }));
    expect(consoleErrorMock).toHaveBeenCalledWith(jasmine.stringMatching('Builder Error'));
  });

  it('does not log exception with outputLogsOnException false when builder throws', async () => {
    const mockHandler = jasmine.createSpy().and.throwError(new Error('Builder Error'));
    const consoleErrorMock = spyOn(console, 'error');

    const harness = new BuilderHarness(mockHandler, mockHost);
    const { result, error } = await harness.executeOnce({ outputLogsOnException: false });

    expect(result).toBeUndefined();
    expect(error).toEqual(jasmine.objectContaining({ message: 'Builder Error' }));
    expect(consoleErrorMock).not.toHaveBeenCalledWith(jasmine.stringMatching('Builder Error'));
  });

  it('supports executing a target from within a builder', async () => {
    const mockHandler = jasmine.createSpy().and.returnValue({ success: true });

    const harness = new BuilderHarness(async (_, context) => {
      const run = await context.scheduleTarget({ project: 'test', target: 'another' });
      expect(await run.result).toEqual(jasmine.objectContaining({ success: true }));
      await run.stop();

      return { success: true };
    }, mockHost);
    harness.withBuilderTarget('another', mockHandler);

    const { result } = await harness.executeOnce();

    expect(result).toBeDefined();
    expect(result?.success).toBeTrue();

    expect(mockHandler).toHaveBeenCalled();
  });
});
