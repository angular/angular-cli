/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { CompilerOptions } from '@angular/compiler-cli';
import type { AngularCompilation } from '../../angular/compilation';

export abstract class AngularCompilationContext {
  abstract readonly compilation?: AngularCompilation;
  abstract isPrimary(): this is PrimaryCompilationContext;
  abstract readonly waitUntilReady: Promise<boolean>;
  abstract getCompilerOptions(): Promise<CompilerOptions>;
  abstract dispose(): Promise<void>;

  createSecondaryContext(): AngularCompilationContext {
    return new SecondaryCompilationContext(this);
  }
}

export class PrimaryCompilationContext extends AngularCompilationContext {
  readonly #compilation: AngularCompilation;
  #pendingCompilation = true;
  #resolveCompilationReady: ((value: boolean) => void) | undefined;
  #compilationReadyPromise: Promise<boolean> | undefined;
  #hasErrors = true;

  #compilerOptions: CompilerOptions | undefined;
  #resolveCompilerOptions: ((options: CompilerOptions) => void) | undefined;
  #compilerOptionsPromise: Promise<CompilerOptions> | undefined;

  constructor(compilation: AngularCompilation) {
    super();
    this.#compilation = compilation;
  }

  override isPrimary(): this is PrimaryCompilationContext {
    return true;
  }

  override get compilation(): AngularCompilation {
    return this.#compilation;
  }

  override get waitUntilReady(): Promise<boolean> {
    if (!this.#pendingCompilation) {
      return Promise.resolve(this.#hasErrors);
    }

    this.#compilationReadyPromise ??= new Promise((resolve) => {
      this.#resolveCompilationReady = resolve;
    });

    return this.#compilationReadyPromise;
  }

  override getCompilerOptions(): Promise<CompilerOptions> {
    if (this.#compilerOptions) {
      return Promise.resolve(this.#compilerOptions);
    }

    if (!this.#pendingCompilation) {
      return Promise.resolve({});
    }

    this.#compilerOptionsPromise ??= new Promise((resolve) => {
      this.#resolveCompilerOptions = resolve;
    });

    return this.#compilerOptionsPromise;
  }

  setCompilerOptions(options: CompilerOptions): void {
    this.#compilerOptions = options;
    this.#resolveCompilerOptions?.(options);
    this.#resolveCompilerOptions = undefined;
    this.#compilerOptionsPromise = undefined;
  }

  markAsReady(hasErrors: boolean): void {
    this.#hasErrors = hasErrors;
    this.#resolveCompilationReady?.(hasErrors);
    this.#resolveCompilationReady = undefined;
    this.#compilationReadyPromise = undefined;
    this.#pendingCompilation = false;

    if (this.#resolveCompilerOptions) {
      this.#resolveCompilerOptions(this.#compilerOptions ?? {});
      this.#resolveCompilerOptions = undefined;
      this.#compilerOptionsPromise = undefined;
    }
  }

  markAsInProgress(): void {
    this.#pendingCompilation = true;
    this.#compilerOptions = undefined;
  }

  #disposal: Promise<void> | undefined;

  override dispose(): Promise<void> {
    // Reuse any in progress disposal to ensure all callers can await completion
    return (this.#disposal ??= this.#close());
  }

  async #close(): Promise<void> {
    this.markAsReady(true);
    try {
      await this.#compilation.close?.();
    } catch {
      // Suppress closure errors to avoid unhandled rejections during teardown.
    }
  }
}

export class SecondaryCompilationContext extends AngularCompilationContext {
  constructor(private readonly primaryContext?: AngularCompilationContext) {
    super();
  }

  override isPrimary(): this is PrimaryCompilationContext {
    return false;
  }

  override get compilation(): undefined {
    return undefined;
  }

  override get waitUntilReady(): Promise<boolean> {
    return this.primaryContext?.waitUntilReady ?? Promise.resolve(false);
  }

  override getCompilerOptions(): Promise<CompilerOptions> {
    return this.primaryContext?.getCompilerOptions() ?? Promise.resolve({});
  }

  override async dispose(): Promise<void> {
    // No-op for secondary context to avoid disposing the primary compilation worker
  }
}
