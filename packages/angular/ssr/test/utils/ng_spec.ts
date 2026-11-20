/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// The compiler is needed as tests are in JIT.
/* eslint-disable import/no-unassigned-import */
import '@angular/compiler';
/* eslint-enable import/no-unassigned-import */

import { Component, PlatformRef, inject, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { setTimeout } from 'node:timers/promises';
import { renderAngular } from '../../src/utils/ng';

const BASE_HTML = '<html><head></head><body><app-root></app-root></body></html>';

describe('renderAngular', () => {
  beforeEach(async () => {
    // Drain any asyncDestroyPlatform macrotask scheduled by a previous spec.
    await setTimeout(0);
  });

  afterEach(async () => {
    await setTimeout(0);
  });

  it('should return { hasNavigationError: true } without bootstrapping when signal is already aborted', async () => {
    const bootstrapSpy = jasmine.createSpy('bootstrap');
    const destroySpy = spyOn(PlatformRef.prototype, 'destroy').and.callThrough();
    const controller = new AbortController();
    controller.abort();

    const result = await renderAngular(
      BASE_HTML,
      bootstrapSpy,
      new URL('http://localhost/'),
      [],
      'ssr',
      controller.signal,
    );

    expect(result).toEqual({ hasNavigationError: true });
    expect(bootstrapSpy).not.toHaveBeenCalled();
    await setTimeout(0);
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it('should reject content() with AbortError and destroy platform once when aborted before content() runs', async () => {
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'Standalone works',
    })
    class AppComponent {
      constructor() {
        destroySpy = spyOn(inject(PlatformRef), 'destroy').and.callThrough();
      }
    }

    const controller = new AbortController();
    const result = await renderAngular(
      BASE_HTML,
      (context) =>
        bootstrapApplication(
          AppComponent,
          { providers: [provideZonelessChangeDetection()] },
          context,
        ),
      new URL('http://localhost/'),
      [],
      'ssr',
      controller.signal,
    );

    expect(result.hasNavigationError).toBeFalse();
    if (!('content' in result)) {
      fail('Expected renderAngular result to expose content()');

      return;
    }

    controller.abort('client disconnected');

    let caughtError: unknown;
    try {
      await result.content();
      fail('Expected content() to reject with AbortError');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(DOMException);
    expect((caughtError as DOMException).name).toBe('AbortError');
    expect((caughtError as DOMException).message).toContain(
      'Request for: http://localhost/ was aborted.\nclient disconnected',
    );

    await setTimeout(0);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should reject content() with AbortError if destroy() was already called', async () => {
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'Destroy before content works',
    })
    class AppComponent {
      constructor() {
        destroySpy = spyOn(inject(PlatformRef), 'destroy').and.callThrough();
      }
    }

    const result = await renderAngular(
      BASE_HTML,
      (context) =>
        bootstrapApplication(
          AppComponent,
          { providers: [provideZonelessChangeDetection()] },
          context,
        ),
      new URL('http://localhost/'),
      [],
      'ssr',
    );

    if (!('content' in result)) {
      fail('Expected renderAngular result to expose content()');

      return;
    }

    const destroyPromise = result.destroy();
    await expectAsync(result.content()).toBeRejectedWithError(
      DOMException,
      /Request for: http:\/\/localhost\/ was aborted/,
    );
    await destroyPromise;
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should make destroy() idempotent and return the same promise when called multiple times', async () => {
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'Idempotent works',
    })
    class AppComponent {
      constructor() {
        destroySpy = spyOn(inject(PlatformRef), 'destroy').and.callThrough();
      }
    }

    const result = await renderAngular(
      BASE_HTML,
      (context) =>
        bootstrapApplication(
          AppComponent,
          { providers: [provideZonelessChangeDetection()] },
          context,
        ),
      new URL('http://localhost/'),
      [],
      'ssr',
    );

    if (!('destroy' in result)) {
      fail('Expected renderAngular result to expose destroy()');

      return;
    }

    const p1 = result.destroy();
    const p2 = result.destroy();
    expect(p1).toBe(p2);

    await Promise.all([p1, p2, result.destroy()]);
    await result.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
