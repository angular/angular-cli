/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createSharedFile, createSharedServerFiles } from './utils';

describe('server-rendering shared file utilities', () => {
  describe('createSharedFile', () => {
    it('should create a Uint8Array backed by SharedArrayBuffer from string', () => {
      const text = 'console.log("hello world");';
      const shared = createSharedFile(text);

      expect(shared instanceof Uint8Array).toBeTrue();
      expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();
      expect(shared.byteLength).toBe(Buffer.byteLength(text, 'utf-8'));

      const decoded = Buffer.from(shared.buffer, shared.byteOffset, shared.byteLength).toString(
        'utf-8',
      );
      expect(decoded).toBe(text);
    });

    it('should correctly handle multi-byte UTF-8 characters', () => {
      const text = 'export const greeting = "🚀 Привет, мир! 🌍";';
      const shared = createSharedFile(text);

      expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();
      const decoded = Buffer.from(shared.buffer, shared.byteOffset, shared.byteLength).toString(
        'utf-8',
      );
      expect(decoded).toBe(text);
    });

    it('should handle empty string', () => {
      const shared = createSharedFile('');

      expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();
      expect(shared.byteLength).toBe(0);
      const decoded = Buffer.from(shared.buffer, shared.byteOffset, shared.byteLength).toString(
        'utf-8',
      );
      expect(decoded).toBe('');
    });

    it('should handle empty Uint8Array', () => {
      const shared = createSharedFile(new Uint8Array(0));

      expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();
      expect(shared.byteLength).toBe(0);
    });

    it('should return the same Uint8Array if already backed by SharedArrayBuffer', () => {
      const text = 'export default 42;';
      const shared1 = createSharedFile(text);
      const shared2 = createSharedFile(shared1);

      expect(shared2).toBe(shared1);
      expect(shared2.buffer).toBe(shared1.buffer);
    });

    it('should return existing Uint8Array view if already backed by SharedArrayBuffer with non-zero byteOffset', () => {
      const text = '0123456789abcdef';
      const shared1 = createSharedFile(text);
      const subView = new Uint8Array(shared1.buffer, 4, 8);
      const shared2 = createSharedFile(subView);

      expect(shared2).toBe(subView);
      expect(shared2.byteOffset).toBe(4);
      expect(shared2.byteLength).toBe(8);

      const decoded = Buffer.from(shared2.buffer, shared2.byteOffset, shared2.byteLength).toString(
        'utf-8',
      );
      expect(decoded).toBe('456789ab');
    });

    it('should convert standard Uint8Array to SharedArrayBuffer backed Uint8Array', () => {
      const regularBuffer = Buffer.from('export const test = true;');
      expect(regularBuffer.buffer instanceof SharedArrayBuffer).toBeFalse();

      const shared = createSharedFile(regularBuffer);
      expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();

      const decoded = Buffer.from(shared.buffer, shared.byteOffset, shared.byteLength).toString(
        'utf-8',
      );
      expect(decoded).toBe('export const test = true;');
    });

    it('should handle Uint8Array slice with non-zero byteOffset from standard ArrayBuffer', () => {
      const target = 'export const data = 123;';
      const fullBuffer = Buffer.from(`__PREFIX__${target}__SUFFIX__`);
      const offset = Buffer.byteLength('__PREFIX__', 'utf-8');
      const length = Buffer.byteLength(target, 'utf-8');
      const subView = new Uint8Array(fullBuffer.buffer, fullBuffer.byteOffset + offset, length);

      const shared = createSharedFile(subView);
      expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();
      expect(shared.byteLength).toBe(length);

      const decoded = Buffer.from(shared.buffer, shared.byteOffset, shared.byteLength).toString(
        'utf-8',
      );
      expect(decoded).toBe(target);
    });
  });

  describe('createSharedServerFiles', () => {
    it('should convert all entries in a record to SharedArrayBuffer backed Uint8Arrays', () => {
      const files: Record<string, string | Uint8Array> = {
        'main.server.mjs': 'export default function() {}',
        'chunk-1.mjs': 'export const x = 1;',
        'render-utils.mjs': Buffer.from('export const helper = () => true;'),
      };

      const sharedFiles = createSharedServerFiles(files);

      expect(Object.keys(sharedFiles)).toEqual([
        'main.server.mjs',
        'chunk-1.mjs',
        'render-utils.mjs',
      ]);

      for (const [key, shared] of Object.entries(sharedFiles)) {
        expect(shared instanceof Uint8Array).toBeTrue();
        expect(shared.buffer instanceof SharedArrayBuffer).toBeTrue();

        const expectedText =
          typeof files[key] === 'string' ? files[key] : (files[key] as Buffer).toString('utf-8');

        const decoded = Buffer.from(shared.buffer, shared.byteOffset, shared.byteLength).toString(
          'utf-8',
        );
        expect(decoded).toBe(expectedText);
      }
    });

    it('should handle empty file map', () => {
      const sharedFiles = createSharedServerFiles({});
      expect(Object.keys(sharedFiles).length).toBe(0);
    });
  });
});
