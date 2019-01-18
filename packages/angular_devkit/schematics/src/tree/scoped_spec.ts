/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { UnitTestTree } from '../../testing';
import { HostTree } from './host-tree';
import { ScopedTree } from './scoped';


describe('ScopedTree', () => {
  let base: HostTree;
  let scoped: ScopedTree;

  beforeEach(() => {
    base = new HostTree();
    base.create('/file-0-1', '0-1');
    base.create('/file-0-2', '0-2');
    base.create('/file-0-3', '0-3');
    base.create('/level-1/file-1-1', '1-1');
    base.create('/level-1/file-1-2', '1-2');
    base.create('/level-1/file-1-3', '1-3');
    base.create('/level-1/level-2/file-2-1', '2-1');
    base.create('/level-1/level-2/file-2-2', '2-2');
    base.create('/level-1/level-2/file-2-3', '2-3');

    scoped = new ScopedTree(base, 'level-1');
  });

  it('supports exists', () => {
    expect(scoped.exists('/file-1-1')).toBeTruthy();
    expect(scoped.exists('file-1-1')).toBeTruthy();
    expect(scoped.exists('/level-2/file-2-1')).toBeTruthy();
    expect(scoped.exists('level-2/file-2-1')).toBeTruthy();

    expect(scoped.exists('/file-1-4')).toBeFalsy();
    expect(scoped.exists('file-1-4')).toBeFalsy();

    expect(scoped.exists('/file-0-1')).toBeFalsy();
    expect(scoped.exists('file-0-1')).toBeFalsy();
    expect(scoped.exists('/level-1/file-1-1')).toBeFalsy();
    expect(scoped.exists('level-1/file-1-1')).toBeFalsy();
  });

  it('supports read', () => {
    expect(scoped.read('/file-1-2')).not.toBeNull();
    expect(scoped.read('file-1-2')).not.toBeNull();

    const test = new UnitTestTree(scoped);
    expect(test.readContent('/file-1-2')).toBe('1-2');
    expect(test.readContent('file-1-2')).toBe('1-2');

    expect(scoped.read('/file-0-2')).toBeNull();
    expect(scoped.read('file-0-2')).toBeNull();
  });

  it('supports create', () => {
    expect(() => scoped.create('/file-1-4', '1-4')).not.toThrow();

    const test = new UnitTestTree(scoped);
    expect(test.readContent('/file-1-4')).toBe('1-4');
    expect(test.readContent('file-1-4')).toBe('1-4');

    expect(base.exists('/level-1/file-1-4')).toBeTruthy();
  });

  it('supports delete', () => {
    expect(() => scoped.delete('/file-0-3')).toThrow();

    expect(() => scoped.delete('/file-1-3')).not.toThrow();
    expect(scoped.exists('/file-1-3')).toBeFalsy();

    expect(base.exists('/level-1/file-1-3')).toBeFalsy();
  });

  it('supports overwrite', () => {
    expect(() => scoped.overwrite('/file-1-1', '1-1*')).not.toThrow();
    expect(() => scoped.overwrite('/file-1-4', '1-4*')).toThrow();

    const test = new UnitTestTree(scoped);
    expect(test.readContent('/file-1-1')).toBe('1-1*');
    expect(test.readContent('file-1-1')).toBe('1-1*');
  });

  it('supports rename', () => {
    expect(() => scoped.rename('/file-1-1', '/file-1-1-new')).not.toThrow();
    expect(() => scoped.rename('/file-1-4', '/file-1-4-new')).toThrow();

    const test = new UnitTestTree(scoped);
    expect(test.readContent('/file-1-1-new')).toBe('1-1');
    expect(test.readContent('file-1-1-new')).toBe('1-1');
  });

  it('supports get', () => {
    expect(scoped.get('/file-1-1')).not.toBeNull();

    const file = scoped.get('file-1-1');
    expect(file && file.path as string).toBe('/file-1-1');

    expect(scoped.get('/file-0-1')).toBeNull();
    expect(scoped.get('file-0-1')).toBeNull();
  });

  it('supports getDir', () => {
    expect(scoped.getDir('/level-2')).not.toBeNull();

    const dir = scoped.getDir('level-2');
    expect(dir.path as string).toBe('/level-2');
    expect(dir.parent).not.toBeNull();
    const files: string[] = [];
    dir.visit(path => files.push(path));
    files.sort();
    expect(files).toEqual([
      '/level-2/file-2-1',
      '/level-2/file-2-2',
      '/level-2/file-2-3',
    ]);
  });

  it('supports visit', () => {
    const files: string[] = [];
    scoped.visit(path => files.push(path));
    files.sort();
    expect(files).toEqual([
      '/file-1-1',
      '/file-1-2',
      '/file-1-3',
      '/level-2/file-2-1',
      '/level-2/file-2-2',
      '/level-2/file-2-3',
    ]);
  });

  it('supports merge into a scoped tree', () => {
    const other = new HostTree();
    other.create('other-file', 'other');

    scoped.merge(other);

    expect(base.exists('/level-1/other-file')).toBeTruthy();
    expect(base.exists('/other-file')).toBeFalsy();
  });

  it('supports merge from a scoped tree', () => {
    const other = new HostTree();

    other.merge(scoped);

    expect(other.exists('/file-1-1')).toBeTruthy();
    expect(other.exists('file-1-1')).toBeTruthy();
    expect(other.exists('/file-1-2')).toBeTruthy();

    expect(other.exists('/file-0-1')).toBeFalsy();
    expect(other.exists('file-0-1')).toBeFalsy();
    expect(other.exists('/level-1/file-1-1')).toBeFalsy();
    expect(other.exists('level-1/file-1-1')).toBeFalsy();
  });

  it('supports root', () => {
    expect(scoped.root).not.toBeNull();
    expect(scoped.root.path as string).toBe('/');
    expect(scoped.root.parent).toBeNull();
  });
});
