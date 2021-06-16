/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export const AngularPluginSymbol = Symbol.for('@ngtools/webpack[angular-compiler]');

export interface EmitFileResult {
  content?: string;
  map?: string;
  dependencies: readonly string[];
  hash?: Uint8Array;
}

export type FileEmitter = (file: string) => Promise<EmitFileResult | undefined>;

export class FileEmitterRegistration {
  #fileEmitter?: FileEmitter;

  update(emitter: FileEmitter): void {
    this.#fileEmitter = emitter;
  }

  emit(file: string): Promise<EmitFileResult | undefined> {
    if (!this.#fileEmitter) {
      throw new Error('Emit attempted before Angular Webpack plugin initialization.');
    }

    return this.#fileEmitter(file);
  }
}

export class FileEmitterCollection {
  #registrations: FileEmitterRegistration[] = [];

  register(): FileEmitterRegistration {
    const registration = new FileEmitterRegistration();
    this.#registrations.push(registration);

    return registration;
  }

  async emit(file: string): Promise<EmitFileResult | undefined> {
    if (this.#registrations.length === 1) {
      return this.#registrations[0].emit(file);
    }

    for (const registration of this.#registrations) {
      const result = await registration.emit(file);
      if (result) {
        return result;
      }
    }
  }
}
