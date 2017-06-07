/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {ExportStringRef} from './export-ref';
import {FileSystemHost} from './file-system-host';
import * as path from 'path';


describe('ExportStringRef', () => {
  it('works', () => {
    // META
    const ref = new ExportStringRef('./export-ref#ExportStringRef', __dirname);
    expect(ref.ref).toBe(ExportStringRef);
    expect(ref.path).toBe(__dirname);
    expect(ref.module).toBe(path.join(__dirname, 'export-ref.ts'));
  });

  it('works without an inner ref', () => {
    // META
    const ref = new ExportStringRef(path.join(__dirname, 'export-ref'));
    expect(ref.ref).toBe(undefined as any);
    expect(ref.path).toBe(__dirname);
    expect(ref.module).toBe(path.join(__dirname, 'export-ref.ts'));
  });

  it('returns the exports', () => {
    // META
    const ref = new ExportStringRef('./export-ref#ExportStringRef', __dirname, false);
    expect(ref.ref).toEqual({ ExportStringRef });
    expect(ref.path).toBe(__dirname);
    expect(ref.module).toBe(path.join(__dirname, 'export-ref.ts'));
  });

  it('works on package names', () => {
    // META
    const ref = new ExportStringRef('@angular/schematics/tooling#FileSystemHost');
    expect(ref.ref).toEqual(FileSystemHost);
    expect(ref.path).toBe(__dirname);
    expect(ref.module).toBe(path.join(__dirname, 'index.ts'));
  });

  it('works on directory', () => {
    // META
    const ref = new ExportStringRef(__dirname);
    expect(ref.path).toBe(__dirname);
    expect(ref.module).toBe(path.join(__dirname, 'index.ts'));
  });
});
