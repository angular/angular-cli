/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { serialize } from 'node:v8';
import { initializeHash } from './hash';
import { WorkerPool, getSharedBuildWorkerPool, shutdownSharedBuildWorkerPool } from './worker-pool';

describe('Singleton Shared Build Worker Pool', () => {
  beforeAll(async () => {
    await initializeHash();
  });

  afterEach(async () => {
    await shutdownSharedBuildWorkerPool();
  });

  it('should return a WorkerPool instance from getSharedBuildWorkerPool', () => {
    const pool = getSharedBuildWorkerPool();
    expect(pool).toBeDefined();
    expect(pool instanceof WorkerPool).toBeTrue();
  });

  it('should return the identical singleton instance on multiple getSharedBuildWorkerPool calls', () => {
    const pool1 = getSharedBuildWorkerPool();
    const pool2 = getSharedBuildWorkerPool();

    expect(pool1).toBe(pool2);
  });

  it('should reset the singleton instance after shutdownSharedBuildWorkerPool is called', async () => {
    const pool1 = getSharedBuildWorkerPool();
    await shutdownSharedBuildWorkerPool();

    const pool2 = getSharedBuildWorkerPool();
    expect(pool2).not.toBe(pool1);
    expect(pool2 instanceof WorkerPool).toBeTrue();
  });

  it('should dispatch transform-js tasks to the shared worker router', async () => {
    const pool = getSharedBuildWorkerPool();
    const code = 'export const value: number = 42;\n';

    const result = (await pool.run({
      tag: 'transform-js',
      filename: 'test.ts',
      data: code,
      skipLinker: true,
      sourcemap: false,
    })) as Uint8Array;

    expect(result).toBeDefined();
    const text = Buffer.from(result).toString('utf-8');
    expect(text).toContain('42');
  });

  it('should dispatch inline-i18n inlineCode tasks to the shared worker router', async () => {
    const pool = getSharedBuildWorkerPool();
    const code = 'export const greeting = $localize`:@@greeting:Hello`;\n';
    const translation = {
      greeting: {
        messageParts: ['Bonjour'],
        placeholderNames: [],
        text: 'Bonjour',
      },
    };

    const result = (await pool.run({
      tag: 'inline-i18n',
      action: 'inlineCode',
      code,
      filename: 'main.js',
      locale: 'fr',
      translation: new Blob([serialize(translation)]),
      missingTranslation: 'ignore',
    })) as { output: string; messages: unknown[] };

    expect(result.output).toContain('"Bonjour"');
    expect(result.output).not.toContain('$localize');
  });

  it('should dispatch inline-i18n inlineFileBatch tasks to the shared worker router', async () => {
    const pool = getSharedBuildWorkerPool();
    const code = 'export const greeting = $localize`:@@greeting:Hello`;\n';
    const fileBlob = new Blob([code]);
    const translationEs = {
      greeting: {
        messageParts: ['Hola'],
        placeholderNames: [],
        text: 'Hola',
      },
    };
    const translationFr = {
      greeting: {
        messageParts: ['Bonjour'],
        placeholderNames: [],
        text: 'Bonjour',
      },
    };

    const batchResult = (await pool.run({
      tag: 'inline-i18n',
      action: 'inlineFileBatch',
      filename: 'main.js',
      fileKey: 'main.js\0hash123',
      fileBlob,
      missingTranslation: 'ignore',
      locales: new Map([
        ['es', new Blob([serialize(translationEs)])],
        ['fr', new Blob([serialize(translationFr)])],
      ]),
    })) as { file: string; results: { locale: string; code: string }[] };

    expect(batchResult.file).toBe('main.js');
    expect(batchResult.results.length).toBe(2);
    expect(batchResult.results[0].locale).toBe('es');
    expect(batchResult.results[0].code).toContain('"Hola"');
    expect(batchResult.results[1].locale).toBe('fr');
    expect(batchResult.results[1].code).toContain('"Bonjour"');
  });

  it('should execute mixed tasks concurrently across the shared pool without interference', async () => {
    const pool = getSharedBuildWorkerPool();

    const jsPromise = pool.run({
      tag: 'transform-js',
      filename: 'concurrent.ts',
      data: 'export const a: number = 1;\n',
      skipLinker: true,
      sourcemap: false,
    });

    const i18nCodePromise = pool.run({
      tag: 'inline-i18n',
      action: 'inlineCode',
      code: 'export const msg = $localize`:@@m:Hi`;\n',
      filename: 'concurrent.js',
      locale: 'de',
      translation: new Blob([
        serialize({ m: { messageParts: ['Hallo'], placeholderNames: [], text: 'Hallo' } }),
      ]),
      missingTranslation: 'ignore',
    });

    const i18nBatchPromise = pool.run({
      tag: 'inline-i18n',
      action: 'inlineFileBatch',
      filename: 'concurrent-batch.js',
      fileKey: 'concurrent-batch.js\0hash456',
      fileBlob: new Blob(['export const msg = $localize`:@@m:Hi`;\n']),
      missingTranslation: 'ignore',
      locales: new Map([
        [
          'es',
          new Blob([
            serialize({ m: { messageParts: ['Hola'], placeholderNames: [], text: 'Hola' } }),
          ]),
        ],
      ]),
    });

    const [jsResult, i18nCodeResult, i18nBatchResult] = await Promise.all([
      jsPromise as Promise<Uint8Array>,
      i18nCodePromise as Promise<{ output: string }>,
      i18nBatchPromise as Promise<{ file: string; results: { locale: string; code: string }[] }>,
    ]);

    expect(Buffer.from(jsResult).toString('utf-8')).toContain('1');
    expect(i18nCodeResult.output).toContain('"Hallo"');
    expect(i18nBatchResult.results[0].code).toContain('"Hola"');
  });
});
