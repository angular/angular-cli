/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type AngularCompilation, NoopCompilation } from '../../angular/compilation';

export class AngularCompilationContext {
  #compilation: AngularCompilation;
  #pendingCompilation = true;
  #resolveCompilationReady: ((value: boolean) => void) | undefined;
  #compilationReadyPromise: Promise<boolean> | undefined;
  #hasErrors = true;

  constructor(compilation: AngularCompilation) {
    this.#compilation = compilation;
  }

  get compilation(): AngularCompilation {
    return this.#compilation;
  }

  get waitUntilReady(): Promise<boolean> {
    if (!this.#pendingCompilation) {
      return Promise.resolve(this.#hasErrors);
    }

    this.#compilationReadyPromise ??= new Promise((resolve) => {
      this.#resolveCompilationReady = resolve;
    });

    return this.#compilationReadyPromise;
  }

  markAsReady(hasErrors: boolean): void {
    this.#hasErrors = hasErrors;
    this.#resolveCompilationReady?.(hasErrors);
    this.#compilationReadyPromise = undefined;
    this.#pendingCompilation = false;
  }

  markAsInProgress(): void {
    this.#pendingCompilation = true;
  }

  #disposed = false;

  async dispose(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.markAsReady(true);
    try {
      await this.#compilation.close?.();
    } catch {
      // Suppress closure errors to avoid unhandled rejections during teardown.
    }
  }

  createSecondaryContext(): AngularCompilationContext {
    return new SecondaryCompilationContext(this);
  }
}

class SecondaryCompilationContext extends AngularCompilationContext {
  constructor(private primaryContext: AngularCompilationContext) {
    super(new NoopCompilation());
  }

  override get waitUntilReady(): Promise<boolean> {
    return this.primaryContext.waitUntilReady;
  }

  override markAsReady(hasErrors: boolean): void {
    // No-op: secondary contexts do not control compilation state
  }

  override markAsInProgress(): void {
    // No-op: secondary contexts do not control compilation state
  }

  override async dispose(): Promise<void> {
    // No-op for secondary context to avoid disposing the primary compilation worker
  }
}
