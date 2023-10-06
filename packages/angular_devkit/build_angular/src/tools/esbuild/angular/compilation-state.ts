/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class SharedTSCompilationState {
  #pendingCompilation = true;
  #resolveCompilationReady: (() => void) | undefined;
  #compilationReadyPromise: Promise<void> | undefined;

  get waitUntilReady(): Promise<void> {
    if (!this.#pendingCompilation) {
      return Promise.resolve();
    }

    this.#compilationReadyPromise ??= new Promise((resolve) => {
      this.#resolveCompilationReady = resolve;
    });

    return this.#compilationReadyPromise;
  }

  markAsReady(): void {
    this.#resolveCompilationReady?.();
    this.#compilationReadyPromise = undefined;
    this.#pendingCompilation = false;
  }

  markAsInProgress(): void {
    this.#pendingCompilation = true;
  }

  dispose(): void {
    this.markAsReady();
    globalSharedCompilationState = undefined;
  }
}

let globalSharedCompilationState: SharedTSCompilationState | undefined;

export function getSharedCompilationState(): SharedTSCompilationState {
  return (globalSharedCompilationState ??= new SharedTSCompilationState());
}
