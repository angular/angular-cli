/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any no-big-function
import { path } from '../path';
import { fileBuffer } from './buffer';
import { CordHost } from './record';
import { test } from './test';


describe('CordHost', () => {
  const TestHost = test.TestHost;
  const mutatingTestRecord = ['write', 'delete', 'rename'];

  it('works (create)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);
    done();
  });

  it('works (create -> create)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe(undefined, done.fail);
    host.write(path`/blue`, fileBuffer`hi again`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);
    expect(target.$read('/blue')).toBe('hi again');
    done();
  });

  it('works (create -> delete)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe(undefined, done.fail);
    host.delete(path`/blue`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(false);
    done();
  });

  it('works (create -> rename)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe(undefined, done.fail);
    host.rename(path`/blue`, path`/red`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/red` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(false);
    expect(target.$exists('/red')).toBe(true);

    done();
  });

  it('works (create -> rename (identity))', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe(undefined, done.fail);
    host.rename(path`/blue`, path`/blue`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);

    done();
  });

  it('works (create -> rename -> rename)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe(undefined, done.fail);
    host.rename(path`/blue`, path`/red`).subscribe(undefined, done.fail);
    host.rename(path`/red`, path`/yellow`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/yellow` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(false);
    expect(target.$exists('/red')).toBe(false);
    expect(target.$exists('/yellow')).toBe(true);

    done();
  });

  it('works (rename)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'rename', from: path`/hello`, to: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);

    done();
  });

  it('works (rename -> rename)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);
    host.rename(path`/blue`, path`/red`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'rename', from: path`/hello`, to: path`/red` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(false);
    expect(target.$exists('/red')).toBe(true);

    done();
  });

  it('works (rename -> create)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);
    host.write(path`/hello`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'rename', from: path`/hello`, to: path`/blue` },
      { kind: 'write', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(true);
    expect(target.$exists('/blue')).toBe(true);

    done();
  });

  it('works (overwrite)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/hello`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(true);
    expect(target.$read('/hello')).toBe('beautiful world');

    done();
  });

  it('works (overwrite -> overwrite)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/hello`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);
    host.write(path`/hello`, fileBuffer`again`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    // Check that there's only 1 write done.
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(true);
    expect(target.$read('/hello')).toBe('again');

    done();
  });

  it('works (overwrite -> rename)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/hello`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'rename', from: path`/hello`, to: path`/blue` },
      { kind: 'write', path: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);
    expect(target.$read('/blue')).toBe('beautiful world');

    done();
  });

  it('works (overwrite -> delete)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/hello`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);
    host.delete(path`/hello`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'delete', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    done();
  });

  it('works (rename -> overwrite)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);
    host.write(path`/blue`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'rename', from: path`/hello`, to: path`/blue` },
      { kind: 'write', path: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);
    expect(target.$read('/blue')).toBe('beautiful world');

    done();
  });

  it('works (delete)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.delete(path`/hello`).subscribe(undefined, done.fail);

    const target = new TestHost();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'delete', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    done();
  });

  it('works (delete -> create)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.delete(path`/hello`).subscribe(undefined, done.fail);
    host.write(path`/hello`, fileBuffer`beautiful world`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'write', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(true);
    expect(target.$read('/hello')).toBe('beautiful world');
    done();
  });

  it('works (rename -> delete)', done => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);
    host.delete(path`/blue`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);

    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'delete', path: path`/hello` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    done();
  });

  it('works (delete -> rename)', done => {
    const base = new TestHost({
      '/hello': 'world',
      '/blue': 'foo',
    });

    const host = new CordHost(base);
    host.delete(path`/blue`).subscribe(undefined, done.fail);
    host.rename(path`/hello`, path`/blue`).subscribe(undefined, done.fail);

    const target = base.clone();
    host.commit(target).subscribe(undefined, done.fail);
    expect(target.records.filter(x => mutatingTestRecord.includes(x.kind))).toEqual([
      { kind: 'delete', path: path`/hello` },
      { kind: 'write', path: path`/blue` },
    ]);

    expect(target.$exists('/hello')).toBe(false);
    expect(target.$exists('/blue')).toBe(true);
    done();
  });

  it('errors: commit (create: exists)', () => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/blue`, fileBuffer`hi`).subscribe();

    const target = new TestHost({
      '/blue': 'test',
    });

    let error = false;
    host.commit(target).subscribe(undefined, () => error = true, () => error = false);
    expect(error).toBe(true);
  });

  it('errors: commit (overwrite: not exist)', () => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.write(path`/hello`, fileBuffer`hi`).subscribe();

    const target = new TestHost({});

    let error = false;
    host.commit(target).subscribe(undefined, () => error = true, () => error = false);
    expect(error).toBe(true);
  });

  it('errors: commit (rename: not exist)', () => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe();

    const target = new TestHost({});

    let error = false;
    host.commit(target).subscribe(undefined, () => error = true, () => error = false);
    expect(error).toBe(true);
  });

  it('errors: commit (rename: exist)', () => {
    const base = new TestHost({
      '/hello': 'world',
    });

    const host = new CordHost(base);
    host.rename(path`/hello`, path`/blue`).subscribe();

    const target = new TestHost({
      '/blue': 'foo',
    });

    let error = false;
    host.commit(target).subscribe(undefined, () => error = true, () => error = false);
    expect(error).toBe(true);
  });

  it('errors (write directory)', () => {
    const base = new TestHost({
      '/dir/hello': 'world',
    });

    const host = new CordHost(base);
    let error = false;
    host.write(path`/dir`, fileBuffer`beautiful world`)
      .subscribe(undefined, () => error = true, () => error = false);

    expect(error).toBe(true);
  });

  it('errors (delete: not exist)', () => {
    const base = new TestHost({
    });

    const host = new CordHost(base);
    let error = false;
    host.delete(path`/hello`)
      .subscribe(undefined, () => error = true, () => error = false);

    expect(error).toBe(true);
  });

  it('errors (rename: exist)', () => {
    const base = new TestHost({
      '/hello': 'world',
      '/blue': 'foo',
    });

    const host = new CordHost(base);
    let error = false;
    host.rename(path`/hello`, path`/blue`)
      .subscribe(undefined, () => error = true, () => error = false);

    expect(error).toBe(true);
  });

  it('errors (rename: not exist)', () => {
    const base = new TestHost({
    });

    const host = new CordHost(base);
    let error = false;
    host.rename(path`/hello`, path`/blue`)
      .subscribe(undefined, () => error = true, () => error = false);

    expect(error).toBe(true);
  });
});
