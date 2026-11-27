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

import {
  ApplicationRef,
  Component,
  type OnDestroy,
  PendingTasks,
  PlatformRef,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import assert from 'node:assert';
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

    expect(result).toEqual(
      jasmine.objectContaining({
        hasNavigationError: false,
        content: jasmine.any(Function),
      }),
    );
    assert('content' in result);

    controller.abort('client disconnected');

    const contentPromise = result.content();
    await expectAsync(contentPromise).toBeRejectedWithError(
      DOMException,
      'Request for: http://localhost/ was aborted.\nclient disconnected',
    );
    await expectAsync(contentPromise).toBeRejectedWith(
      jasmine.objectContaining({ name: 'AbortError' }),
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

    expect(result).toEqual(
      jasmine.objectContaining({
        content: jasmine.any(Function),
        destroy: jasmine.any(Function),
      }),
    );
    assert('content' in result);

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

    expect(result).toEqual(jasmine.objectContaining({ destroy: jasmine.any(Function) }));
    assert('destroy' in result);

    const p1 = result.destroy();
    const p2 = result.destroy();
    expect(p1).toBe(p2);

    await Promise.all([p1, p2, result.destroy()]);
    await result.destroy();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should reuse the in-flight promise when content() is called concurrently', async () => {
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'Concurrent content works',
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

    expect(result).toEqual(jasmine.objectContaining({ content: jasmine.any(Function) }));
    assert('content' in result);

    const p1 = result.content();
    const p2 = result.content();
    expect(p1).toBe(p2);

    const [html1, html2] = await Promise.all([p1, p2]);
    expect(html1).toContain('Concurrent content works');
    expect(html2).toBe(html1);

    await setTimeout(0);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should reject content() with AbortError if applicationRef is destroyed before rendering runs', async () => {
    let appRef: ApplicationRef | undefined;
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'External app destroy works',
    })
    class AppComponent {
      constructor() {
        appRef = inject(ApplicationRef);
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

    expect(result).toEqual(jasmine.objectContaining({ content: jasmine.any(Function) }));
    assert('content' in result);

    const contentPromise = result.content();
    appRef?.destroy();

    await expectAsync(contentPromise).toBeRejectedWithError(
      DOMException,
      /Request for: http:\/\/localhost\/ was aborted/,
    );

    await setTimeout(0);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should log errors thrown by destroy hooks instead of leaving them uncaught', async () => {
    const error = new Error('Destroy hook error');
    const consoleErrorSpy = spyOn(console, 'error');

    @Component({
      selector: 'app-root',
      template: 'Destroy hook error works',
    })
    class AppComponent implements OnDestroy {
      ngOnDestroy(): void {
        throw error;
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

    expect(result).toEqual(jasmine.objectContaining({ destroy: jasmine.any(Function) }));
    assert('destroy' in result);

    await expectAsync(result.destroy()).toBeResolved();
    expect(consoleErrorSpy).toHaveBeenCalledOnceWith(
      'An error occurred while destroying the platform.',
      error,
    );
  });

  it('should return navigation error when applicationRef.injector is destroyed before applicationRef', async () => {
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'Partial injector destroy works',
    })
    class AppComponent {
      constructor() {
        const appRef = inject(ApplicationRef);
        const pendingTasks = inject(PendingTasks);
        destroySpy = spyOn(inject(PlatformRef), 'destroy').and.callThrough();
        // Simulate a partial destroy where the EnvironmentInjector is marked destroyed
        // before ApplicationRef.ngOnDestroy() runs.
        spyOn(appRef as unknown as OnDestroy, 'ngOnDestroy');
        pendingTasks.add();
        globalThis.setTimeout(() => appRef.injector.destroy(), 0);
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

    expect(result).toEqual({ hasNavigationError: true });
    await setTimeout(0);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('should reject content() when applicationRef.injector is destroyed before applicationRef', async () => {
    let appRef: ApplicationRef | undefined;
    let destroySpy: jasmine.Spy | undefined;

    @Component({
      selector: 'app-root',
      template: 'Partial injector destroy before content works',
    })
    class AppComponent {
      constructor() {
        appRef = inject(ApplicationRef);
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

    assert('content' in result);
    assert(appRef);

    spyOn(appRef as unknown as OnDestroy, 'ngOnDestroy');
    appRef.injector.destroy();
    expect(appRef.destroyed).toBeFalse();
    expect(appRef.injector.destroyed).toBeTrue();

    await expectAsync(result.content()).toBeRejectedWithError(
      DOMException,
      /Request for: http:\/\/localhost\/ was aborted/,
    );

    await setTimeout(0);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
