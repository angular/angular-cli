/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import { CollectionCannotBeResolvedException } from '.';
import { ExportStringRef } from './export-ref';


describe('ExportStringRef', () => {
  // Depending on how the package is built the module might be either .js or .ts.
  // To make expectations easier, we strip the extension.
  const stripExtension = (p: string) => p.replace(/\.(j|t)s$/, '');

  it('works', () => {
    // META
    const ref = new ExportStringRef('./export-ref#ExportStringRef', __dirname);
    expect(ref.ref).toBe(ExportStringRef);
    expect(ref.path).toBe(__dirname);
    expect(stripExtension(ref.module)).toBe(path.join(__dirname, 'export-ref'));
  });

  it('works without an inner ref', () => {
    // META
    const ref = new ExportStringRef(path.join(__dirname, 'export-ref'));
    expect(ref.ref).toBe(undefined);
    expect(ref.path).toBe(__dirname);
    expect(stripExtension(ref.module)).toBe(path.join(__dirname, 'export-ref'));
  });

  it('returns the exports', () => {
    // META
    const ref = new ExportStringRef('./export-ref#ExportStringRef', __dirname, false);
    expect(ref.ref).toEqual({ ExportStringRef });
    expect(ref.path).toBe(__dirname);
    expect(stripExtension(ref.module)).toBe(path.join(__dirname, 'export-ref'));
  });

  it('works on package names', () => {
    // META
    const ref = new ExportStringRef(
      '@angular-devkit/schematics/tools#CollectionCannotBeResolvedException',
    );
    expect(ref.ref).toEqual(CollectionCannotBeResolvedException);
    expect(ref.path).toBe(__dirname);
    expect(stripExtension(ref.module)).toBe(path.join(__dirname, 'index'));
  });

  it('works on directory', () => {
    // META
    const ref = new ExportStringRef(__dirname);
    expect(ref.path).toBe(__dirname);
    expect(stripExtension(ref.module)).toBe(path.join(__dirname, 'index'));
  });
});
