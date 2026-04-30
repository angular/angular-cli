/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  generateDebugId,
  injectDebugIdIntoJs,
  injectDebugIdIntoSourceMap,
} from './debug-id';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('debug-id', () => {
  describe('generateDebugId', () => {
    it('produces a canonical UUIDv5 string', () => {
      expect(generateDebugId('hello')).toMatch(UUID);
      expect(generateDebugId(new TextEncoder().encode('hello'))).toMatch(
        UUID,
      );
    });

    it('is deterministic for identical inputs', () => {
      expect(generateDebugId('same content')).toBe(generateDebugId('same content'));
    });

    it('differs for different inputs', () => {
      expect(generateDebugId('one')).not.toBe(generateDebugId('two'));
    });
  });

  describe('injectDebugIdIntoJs', () => {
    const id = '11111111-2222-5333-9444-555555555555';

    it('inserts the debugId comment immediately above sourceMappingURL', () => {
      const text = 'console.log(1);\n//# sourceMappingURL=foo.js.map\n';
      const result = injectDebugIdIntoJs(text, id);
      expect(result).toBe(
        'console.log(1);\n//# debugId=11111111-2222-5333-9444-555555555555\n//# sourceMappingURL=foo.js.map\n',
      );
    });

    it('appends the comment when no sourceMappingURL is present', () => {
      const text = 'console.log(1);\n';
      const result = injectDebugIdIntoJs(text, id);
      expect(result).toBe('console.log(1);\n//# debugId=11111111-2222-5333-9444-555555555555\n');
    });

    it('appends a leading newline when input does not end with one', () => {
      const text = 'console.log(1);';
      const result = injectDebugIdIntoJs(text, id);
      expect(result).toBe('console.log(1);\n//# debugId=11111111-2222-5333-9444-555555555555\n');
    });

    it('replaces an existing debugId comment (idempotent)', () => {
      const original = 'console.log(1);\n//# debugId=00000000-0000-5000-8000-000000000000\n//# sourceMappingURL=foo.js.map\n';
      const result = injectDebugIdIntoJs(original, id);
      expect(result).toBe(
        'console.log(1);\n//# debugId=11111111-2222-5333-9444-555555555555\n//# sourceMappingURL=foo.js.map\n',
      );
      // Re-running with the same id is a no-op.
      expect(injectDebugIdIntoJs(result, id)).toBe(result);
    });
  });

  describe('injectDebugIdIntoSourceMap', () => {
    const id = '11111111-2222-5333-9444-555555555555';

    it('adds a top-level debugId field', () => {
      const map = JSON.stringify({ version: 3, sources: ['a.ts'], mappings: '' });
      const updated = JSON.parse(injectDebugIdIntoSourceMap(map, id));
      expect(updated.debugId).toBe(id);
      expect(updated.version).toBe(3);
    });

    it('overwrites an existing debugId field', () => {
      const map = JSON.stringify({ version: 3, debugId: 'old', mappings: '' });
      const updated = JSON.parse(injectDebugIdIntoSourceMap(map, id));
      expect(updated.debugId).toBe(id);
    });

    it('returns the original input when JSON is malformed', () => {
      const malformed = '{ this is not json';
      expect(injectDebugIdIntoSourceMap(malformed, id)).toBe(malformed);
    });
  });
});
