/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { encodeTranslationToBuffer } from './i18n-translation-encoder';
import {
  SharedTranslationDictionary,
  createSharedTranslationProxy,
} from './i18n-translation-reader';

describe('SharedArrayBuffer Translation Encoder & Reader', () => {
  it('encodes and reads simple key-value translations', () => {
    const translation = {
      greeting: 'Hello',
      farewell: 'Goodbye',
      numberKey: 42,
      arrayKey: ['part1', 'part2'],
    };

    const buffer = encodeTranslationToBuffer(translation);
    const dictionary = new SharedTranslationDictionary<unknown>(buffer);

    expect(dictionary.get('greeting')).toEqual('Hello');
    expect(dictionary.get('farewell')).toEqual('Goodbye');
    expect(dictionary.get('numberKey')).toEqual(42);
    expect(dictionary.get('arrayKey')).toEqual(['part1', 'part2']);
    expect(dictionary.get('nonexistent')).toBeUndefined();
  });

  it('works with Proxy wrapper and "in" operator', () => {
    const translation = {
      msg1: 'Message 1',
      msg2: 'Message 2',
    };

    const buffer = encodeTranslationToBuffer(translation);
    const proxy = createSharedTranslationProxy<string>(buffer);

    expect(proxy['msg1']).toEqual('Message 1');
    expect(proxy['msg2']).toEqual('Message 2');
    expect(proxy['unknown']).toBeUndefined();
    expect('msg1' in proxy).toBeTrue();
    expect('msg2' in proxy).toBeTrue();
    expect('unknown' in proxy).toBeFalse();
  });

  it('supports Object.prototype.hasOwnProperty and Object.getOwnPropertyDescriptor on Proxy', () => {
    const translation = {
      msg1: 'Message 1',
    };

    const buffer = encodeTranslationToBuffer(translation);
    const proxy = createSharedTranslationProxy<string>(buffer);

    expect(Object.prototype.hasOwnProperty.call(proxy, 'msg1')).toBeTrue();
    expect(Object.prototype.hasOwnProperty.call(proxy, 'unknown')).toBeFalse();

    const desc = Object.getOwnPropertyDescriptor(proxy, 'msg1');
    expect(desc).toBeDefined();
    expect(desc?.value).toEqual('Message 1');
    expect(desc?.enumerable).toBeTrue();

    const missingDesc = Object.getOwnPropertyDescriptor(proxy, 'unknown');
    expect(missingDesc).toBeUndefined();

    // Verify standard Object.prototype methods work and don't throw
    expect(typeof proxy.toString).toBe('function');
    expect(proxy.toString()).toEqual('[object Object]');
    expect(typeof proxy.valueOf).toBe('function');
    expect('toString' in proxy).toBeTrue();
    expect(String(proxy)).toEqual('[object Object]');
  });

  it('handles non-BMP Unicode surrogate pairs and high BMP keys correctly', () => {
    const translation = {
      '😀': 'emoji message',
      '\uE000': 'uE000 message',
      'abc': 'abc message',
    };

    const buffer = encodeTranslationToBuffer(translation);
    const dictionary = new SharedTranslationDictionary<string>(buffer);

    expect(dictionary.get('😀')).toEqual('emoji message');
    expect(dictionary.get('\uE000')).toEqual('uE000 message');
    expect(dictionary.get('abc')).toEqual('abc message');
  });

  it('handles empty translation dictionaries', () => {
    const buffer = encodeTranslationToBuffer({});
    const dictionary = new SharedTranslationDictionary(buffer);

    expect(dictionary.get('anyKey')).toBeUndefined();
  });

  it('caches missing translation lookups efficiently', () => {
    const translation = {
      msg1: 'Message 1',
    };

    const buffer = encodeTranslationToBuffer<string>(translation);
    const dictionary = new SharedTranslationDictionary<string>(buffer);

    // First lookup for missing key
    expect(dictionary.get('missingKey')).toBeUndefined();
    // Second lookup for missing key (should hit lazyCache NOT_FOUND sentinel)
    expect(dictionary.get('missingKey')).toBeUndefined();
  });

  it('validates header size and offsets on initialization', () => {
    // Buffer too small
    const smallSab = new SharedArrayBuffer(8);
    expect(() => new SharedTranslationDictionary(smallSab)).toThrowError(
      'Invalid SharedArrayBuffer translation header: buffer too small.',
    );

    // Invalid magic header
    const badMagicSab = new SharedArrayBuffer(16);
    expect(() => new SharedTranslationDictionary(badMagicSab)).toThrowError(
      'Invalid SharedArrayBuffer translation header magic identifier.',
    );

    // Out-of-bounds offset values
    const invalidOffsetsSab = new SharedArrayBuffer(16);
    const view = new Uint32Array(invalidOffsetsSab);
    view[0] = 0x4931384e; // I18N_MAGIC_ID
    view[1] = 100; // entryCount = 100 entries requiring 1600 bytes
    view[2] = 16;
    view[3] = 16;
    expect(() => new SharedTranslationDictionary(invalidOffsetsSab)).toThrowError(
      'Invalid SharedArrayBuffer translation header offsets.',
    );

    // Unaligned header size
    const unalignedHeaderSab = new SharedArrayBuffer(32);
    const unalignedView = new Uint32Array(unalignedHeaderSab);
    unalignedView[0] = 0x4931384e;
    unalignedView[1] = 0;
    unalignedView[2] = 17; // unaligned header byte size
    unalignedView[3] = 17;
    expect(() => new SharedTranslationDictionary(unalignedHeaderSab)).toThrowError(
      'Invalid SharedArrayBuffer translation header offsets.',
    );
  });

  it('safely handles corrupted index offsets within a valid header', () => {
    // 1 entry: header (16 bytes) + index (16 bytes) + pool (10 bytes) = 42 bytes
    const buffer = new SharedArrayBuffer(48);
    const uint32 = new Uint32Array(buffer);
    uint32[0] = 0x4931384e; // Magic
    uint32[1] = 1; // 1 entry
    uint32[2] = 16; // header size
    uint32[3] = 32; // string pool offset

    // Corrupted entry: keyOffset points past pool length
    uint32[4] = 100; // keyOffset = 100
    uint32[5] = 5; // keyLen = 5
    uint32[6] = 0; // valOffset = 0
    uint32[7] = 5; // valLen = 5

    const dictionary = new SharedTranslationDictionary(buffer);
    expect(dictionary.get('testKey')).toBeUndefined();
  });

  it('safely handles undefined translation values', () => {
    const translation = {
      definedKey: 'value',
      undefinedKey: undefined,
    };

    const buffer = encodeTranslationToBuffer(translation as Record<string, unknown>);
    const dictionary = new SharedTranslationDictionary<unknown>(buffer);

    expect(dictionary.get('definedKey')).toEqual('value');
    expect(dictionary.get('undefinedKey')).toBeNull();
  });

  it('encodes and reads large translation dictionaries exceeding 64KB', () => {
    const largeTranslation: Record<string, string> = {};
    for (let i = 0; i < 4000; i++) {
      largeTranslation[`key_${i.toString().padStart(6, '0')}`] = `Message content for key ${i}`;
    }

    const buffer = encodeTranslationToBuffer<string>(largeTranslation);
    expect(buffer.byteLength).toBeGreaterThan(65536);

    const dictionary = new SharedTranslationDictionary<string>(buffer);
    expect(dictionary.get('key_000000')).toEqual('Message content for key 0');
    expect(dictionary.get('key_002000')).toEqual('Message content for key 2000');
    expect(dictionary.get('key_003999')).toEqual('Message content for key 3999');
    expect(dictionary.get('nonexistent_key')).toBeUndefined();
  });
});
