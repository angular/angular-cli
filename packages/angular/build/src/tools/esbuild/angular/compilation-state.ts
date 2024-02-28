/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class SharedTSCompilationState {
  #pendingCompilation = true;
  #resolveCompilationReady: ((value: boolean) => void) | undefined;
  #compilationReadyPromise: Promise<boolean> | undefined;
  #hasErrors = true;

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

  dispose(): void {
    this.markAsReady(true);
    globalSharedCompilationState = undefined;
  }
}

let globalSharedCompilationState: SharedTSCompilationState | undefined;

export function getSharedCompilationState(): SharedTSCompilationState {
  return (globalSharedCompilationState ??= new SharedTSCompilationState());
}
