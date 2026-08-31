/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { CompilerOptions } from '@angular/compiler-cli';
import type { AngularCompilation } from '../../angular/compilation';
import { PrimaryCompilationContext, SecondaryCompilationContext } from './compilation-state';

describe('compilation-state', () => {
  let mockCompilation: jasmine.SpyObj<AngularCompilation>;

  beforeEach(() => {
    mockCompilation = jasmine.createSpyObj<AngularCompilation>('AngularCompilation', [
      'initialize',
      'close',
    ]);
  });

  describe('PrimaryCompilationContext', () => {
    it('identifies as primary and provides the underlying compilation', () => {
      const context = new PrimaryCompilationContext(mockCompilation);

      expect(context.isPrimary()).toBe(true);
      expect(context.compilation).toBe(mockCompilation);
    });

    it('resolves getCompilerOptions after setCompilerOptions is called', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);
      const options: CompilerOptions = { target: 9, allowJs: true };

      context.setCompilerOptions(options);

      const resolved = await context.getCompilerOptions();
      expect(resolved).toEqual(options);
    });

    it('resolves pending getCompilerOptions when setCompilerOptions is called later', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);
      const options: CompilerOptions = { target: 9, allowJs: true };

      const optionsPromise = context.getCompilerOptions();
      context.setCompilerOptions(options);

      const resolved = await optionsPromise;
      expect(resolved).toEqual(options);
    });

    it('manages ready state lifecycle correctly', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);

      // Initially in progress
      const readyPromise = context.waitUntilReady;
      context.markAsReady(false);

      const hasErrors = await readyPromise;
      expect(hasErrors).toBe(false);

      // When already ready, immediately returns error state
      expect(await context.waitUntilReady).toBe(false);

      // Mark in progress again
      context.markAsInProgress();
      const secondReadyPromise = context.waitUntilReady;
      context.markAsReady(true);

      expect(await secondReadyPromise).toBe(true);
    });

    it('closes compilation and marks ready with errors on dispose', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);

      const readyPromise = context.waitUntilReady;
      await context.dispose();

      expect(mockCompilation.close).toHaveBeenCalledTimes(1);
      expect(await readyPromise).toBe(true);
    });

    it('unblocks pending getCompilerOptions on markAsReady error', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);

      const optionsPromise = context.getCompilerOptions();
      context.markAsReady(true);

      const options = await optionsPromise;
      expect(options).toEqual({});
    });

    it('returns empty options from getCompilerOptions when compilation is not pending and options are unset', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);

      context.markAsReady(false);

      const options = await context.getCompilerOptions();
      expect(options).toEqual({});
    });

    it('clears cached compiler options on markAsInProgress to wait for fresh options on rebuild', async () => {
      const context = new PrimaryCompilationContext(mockCompilation);
      const initialOptions: CompilerOptions = { target: 9, allowJs: false };
      context.setCompilerOptions(initialOptions);
      context.markAsReady(false);

      expect(await context.getCompilerOptions()).toEqual(initialOptions);

      // Rebuild starts
      context.markAsInProgress();

      // Pending call should wait for new options rather than returning stale ones
      const nextOptionsPromise = context.getCompilerOptions();
      const updatedOptions: CompilerOptions = { target: 10, allowJs: true };
      context.setCompilerOptions(updatedOptions);

      expect(await nextOptionsPromise).toEqual(updatedOptions);
    });

    it('creates a linked SecondaryCompilationContext', () => {
      const context = new PrimaryCompilationContext(mockCompilation);
      const secondary = context.createSecondaryContext();

      expect(secondary).toBeInstanceOf(SecondaryCompilationContext);
      expect(secondary.isPrimary()).toBe(false);
      expect(secondary.compilation).toBeUndefined();
    });
  });

  describe('SecondaryCompilationContext', () => {
    it('identifies as non-primary and has undefined compilation', () => {
      const primary = new PrimaryCompilationContext(mockCompilation);
      const secondary = primary.createSecondaryContext();

      expect(secondary.isPrimary()).toBe(false);
      expect(secondary.compilation).toBeUndefined();
    });

    it('delegates waitUntilReady to primary context', async () => {
      const primary = new PrimaryCompilationContext(mockCompilation);
      const secondary = primary.createSecondaryContext();

      const secondaryReadyPromise = secondary.waitUntilReady;
      primary.markAsReady(false);

      expect(await secondaryReadyPromise).toBe(false);
    });

    it('delegates getCompilerOptions to primary context', async () => {
      const primary = new PrimaryCompilationContext(mockCompilation);
      const secondary = primary.createSecondaryContext();
      const options: CompilerOptions = { target: 9, allowJs: false };

      primary.setCompilerOptions(options);

      expect(await secondary.getCompilerOptions()).toEqual(options);
    });

    it('does not dispose primary compilation when secondary is disposed', async () => {
      const primary = new PrimaryCompilationContext(mockCompilation);
      const secondary = primary.createSecondaryContext();

      await secondary.dispose();

      expect(mockCompilation.close).not.toHaveBeenCalled();
    });

    it('handles standalone instantiation with sensible defaults', async () => {
      const standalone = new SecondaryCompilationContext();

      expect(standalone.isPrimary()).toBe(false);
      expect(standalone.compilation).toBeUndefined();
      expect(await standalone.waitUntilReady).toBe(false);
      expect(await standalone.getCompilerOptions()).toEqual({});
    });
  });
});
