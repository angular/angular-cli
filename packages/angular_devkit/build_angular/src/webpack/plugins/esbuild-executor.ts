/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type {
  FormatMessagesOptions,
  PartialMessage,
  TransformOptions,
  TransformResult,
} from 'esbuild';

/**
 * Provides the ability to execute esbuild regardless of the current platform's support
 * for using the native variant of esbuild. The native variant will be preferred (assuming
 * the `alwaysUseWasm` constructor option is `false) due to its inherent performance advantages.
 * At first use of esbuild, a supportability test will be automatically performed and the
 * WASM-variant will be used if needed by the platform.
 */
export class EsbuildExecutor
  implements Pick<typeof import('esbuild'), 'transform' | 'formatMessages'>
{
  private esbuildTransform: this['transform'];
  private esbuildFormatMessages: this['formatMessages'];
  private initialized = false;

  /**
   * Constructs an instance of the `EsbuildExecutor` class.
   *
   * @param alwaysUseWasm If true, the WASM-variant will be preferred and no support test will be
   * performed; if false (default), the native variant will be preferred.
   */
  constructor(private alwaysUseWasm = false) {
    this.esbuildTransform = this.esbuildFormatMessages = () => {
      throw new Error('esbuild implementation missing');
    };
  }

  /**
   * Determines whether the native variant of esbuild can be used on the current platform.
   *
   * @returns A promise which resolves to `true`, if the native variant of esbuild is support or `false`, if the WASM variant is required.
   */
  static async hasNativeSupport(): Promise<boolean> {
    // Try to use native variant to ensure it is functional for the platform.
    try {
      const { formatMessages } = await import('esbuild');
      await formatMessages([], { kind: 'error' });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes the esbuild transform and format messages functions.
   *
   * @returns A promise that fulfills when esbuild has been loaded and available for use.
   */
  private async ensureEsbuild(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If the WASM variant was preferred at class construction or native is not supported, use WASM
    if (this.alwaysUseWasm || !(await EsbuildExecutor.hasNativeSupport())) {
      await this.useWasm();
      this.initialized = true;

      return;
    }

    try {
      // Use the faster native variant if available.
      const { transform, formatMessages } = await import('esbuild');

      this.esbuildTransform = transform;
      this.esbuildFormatMessages = formatMessages;
    } catch {
      // If the native variant is not installed then use the WASM-based variant
      await this.useWasm();
    }

    this.initialized = true;
  }

  /**
   * Transitions an executor instance to use the WASM-variant of esbuild.
   */
  private async useWasm(): Promise<void> {
    const { transform, formatMessages } = await import('esbuild-wasm');
    this.esbuildTransform = transform;
    this.esbuildFormatMessages = formatMessages;

    // The ESBUILD_BINARY_PATH environment variable cannot exist when attempting to use the
    // WASM variant. If it is then the binary located at the specified path will be used instead
    // of the WASM variant.
    delete process.env.ESBUILD_BINARY_PATH;

    this.alwaysUseWasm = true;
  }

  async transform(
    input: string | Uint8Array,
    options?: TransformOptions,
  ): Promise<TransformResult> {
    await this.ensureEsbuild();

    return this.esbuildTransform(input, options);
  }

  async formatMessages(
    messages: PartialMessage[],
    options: FormatMessagesOptions,
  ): Promise<string[]> {
    await this.ensureEsbuild();

    return this.esbuildFormatMessages(messages, options);
  }
}
