/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
// tslint:disable:no-non-null-assertion
// tslint:disable:no-implicit-dependencies
import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsAsyncHost, NodeJsSyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import { Observable, Subscription } from 'rxjs';

const temp = require('temp');


// TODO: replace this with an "it()" macro that's reusable globally.
let linuxOnlyIt: typeof it = it;
if (process.platform.startsWith('win') || process.platform.startsWith('darwin')) {
  linuxOnlyIt = xit;
}


describe('NodeJsAsyncHost', () => {
  let root: string;
  let host: virtualFs.Host<fs.Stats>;

  beforeEach(() => {
    root = temp.mkdirSync('core-node-spec-');
    host = new virtualFs.ScopedHost(new NodeJsAsyncHost(), normalize(root));
  });
  afterEach(done => host.delete(normalize('/')).toPromise().then(done, done.fail));

  linuxOnlyIt('can watch', done => {
    let obs: Observable<virtualFs.HostWatchEvent>;
    let subscription: Subscription;
    const content = virtualFs.stringToFileBuffer('hello world');
    const content2 = virtualFs.stringToFileBuffer('hello world 2');
    const allEvents: virtualFs.HostWatchEvent[] = [];

    Promise.resolve()
      .then(() => fs.mkdirSync(root + '/sub1'))
      .then(() => fs.writeFileSync(root + '/sub1/file1', 'hello world'))
      .then(() => {
        obs = host.watch(normalize('/sub1'), { recursive: true }) !;
        expect(obs).not.toBeNull();
        subscription = obs.subscribe(event => { allEvents.push(event); });
      })
      .then(() => new Promise(resolve => setTimeout(resolve, 100)))
      // Discard the events registered so far.
      .then(() => allEvents.splice(0))
      .then(() => host.write(normalize('/sub1/sub2/file3'), content).toPromise())
      .then(() => host.write(normalize('/sub1/file2'), content2).toPromise())
      .then(() => host.delete(normalize('/sub1/file1')).toPromise())
      .then(() => new Promise(resolve => setTimeout(resolve, 2000)))
      .then(() => {
        expect(allEvents.length).toBe(3);
        subscription.unsubscribe();
      })
      .then(done, done.fail);
  }, 30000);
});


describe('NodeJsSyncHost', () => {
  let root: string;
  let host: virtualFs.SyncDelegateHost<fs.Stats>;

  beforeEach(() => {
    root = temp.mkdirSync('core-node-spec-');
    host = new virtualFs.SyncDelegateHost(
      new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(root)));
  });
  afterEach(() => {
    host.delete(normalize('/'));
  });

  linuxOnlyIt('can watch', done => {
    let obs: Observable<virtualFs.HostWatchEvent>;
    let subscription: Subscription;
    const content = virtualFs.stringToFileBuffer('hello world');
    const content2 = virtualFs.stringToFileBuffer('hello world 2');
    const allEvents: virtualFs.HostWatchEvent[] = [];

    Promise.resolve()
      .then(() => fs.mkdirSync(root + '/sub1'))
      .then(() => fs.writeFileSync(root + '/sub1/file1', 'hello world'))
      .then(() => {
        obs = host.watch(normalize('/sub1'), { recursive: true })!;
        expect(obs).not.toBeNull();
        subscription = obs.subscribe(event => { allEvents.push(event); });
      })
      .then(() => new Promise(resolve => setTimeout(resolve, 100)))
      // Discard the events registered so far.
      .then(() => allEvents.splice(0))
      .then(() => {
        host.write(normalize('/sub1/sub2/file3'), content);
        host.write(normalize('/sub1/file2'), content2);
        host.delete(normalize('/sub1/file1'));
      })
      .then(() => new Promise(resolve => setTimeout(resolve, 2000)))
      .then(() => {
        expect(allEvents.length).toBe(3);
        subscription.unsubscribe();
      })
      .then(done, done.fail);
  }, 30000);

});
