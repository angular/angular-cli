/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { generateNameFromPath } from './test-discovery';

describe('generateNameFromPath', () => {
  const roots = ['/project/src/', '/project/'];

  it('should generate a dash-cased name from a simple path', () => {
    const testFile = '/project/src/app/components/my-component.spec.ts';
    const result = generateNameFromPath(testFile, roots, true);
    expect(result).toBe('app-components-my-component');
  });

  it('should handle Windows-style paths', () => {
    const testFile = 'C:\\project\\src\\app\\components\\my-component.spec.ts';
    const result = generateNameFromPath(testFile, ['C:\\project\\src\\'], true);
    expect(result).toBe('app-components-my-component');
  });

  it('should remove test extensions when removeTestExtension is true', () => {
    const testFile = '/project/src/app/utils/helpers.test.ts';
    const result = generateNameFromPath(testFile, roots, true);
    expect(result).toBe('app-utils-helpers');
  });

  it('should not remove test extensions when removeTestExtension is false', () => {
    const testFile = '/project/src/app/utils/helpers.test.ts';
    const result = generateNameFromPath(testFile, roots, false);
    expect(result).toBe('app-utils-helpers.test');
  });

  it('should handle paths with leading dots and slashes', () => {
    const testFile = '/project/src/./app/services/api.service.spec.ts';
    const result = generateNameFromPath(testFile, roots, true);
    expect(result).toBe('app-services-api.service');
  });

  it('should return the basename if no root matches', () => {
    const testFile = '/unrelated/path/to/some/file.spec.ts';
    const result = generateNameFromPath(testFile, roots, true);
    expect(result).toBe('file');
  });

  it('should truncate a long file name', () => {
    const longPath =
      'a/very/long/path/that/definitely/exceeds/the/maximum/allowed/length/for/a/filename/in/order/to/trigger/the/truncation/logic/in/the/function.spec.ts'; // eslint-disable-line max-len
    const testFile = `/project/src/${longPath}`;
    const result = generateNameFromPath(testFile, roots, true);

    expect(result.length).toBeLessThanOrEqual(128);
    expect(result).toBe(
      'a-very-long-path-that-definitely-exceeds-the-maximum-allowe-9cf40291-me-in-order-to-trigger-the-truncation-logic-in-the-function',
    ); // eslint-disable-line max-len
  });

  it('should generate different hashes for different paths with similar truncated names', () => {
    const longPath1 =
      'a/very/long/path/that/definitely/exceeds/the/maximum/allowed/length/for/a/filename/in/order/to/trigger/the/truncation/logic/variant-a.spec.ts'; // eslint-disable-line max-len
    const longPath2 =
      'a/very/long/path/that/definitely/exceeds/the/maximum/allowed/length/for/a/filename/in/order/to/trigger/the/truncation/logic/variant-b.spec.ts'; // eslint-disable-line max-len

    const testFile1 = `/project/src/${longPath1}`;
    const testFile2 = `/project/src/${longPath2}`;

    const result1 = generateNameFromPath(testFile1, roots, true);
    const result2 = generateNameFromPath(testFile2, roots, true);

    expect(result1).not.toBe(result2);
    // The hash is always 8 characters long and is surrounded by hyphens.
    const hashRegex = /-[a-f0-9]{8}-/;
    const hash1 = result1.match(hashRegex)?.[0];
    const hash2 = result2.match(hashRegex)?.[0];

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toBe(hash2);
  });

  it('should not truncate a filename that is exactly the max length', () => {
    const name = 'a'.repeat(128);
    const testFile = `/project/src/${name}.spec.ts`;
    const result = generateNameFromPath(testFile, roots, true);
    expect(result).toBe(name);
  });
});
