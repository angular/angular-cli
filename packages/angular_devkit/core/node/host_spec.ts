/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
// tslint:disable:non-null-operator
import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsAsyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

const temp = require('temp');


describe('NodeJsAsyncHost', () => {
  let root: string;
  let host: virtualFs.Host<fs.Stats>;

  beforeEach(() => {
    root = temp.mkdirSync('core-node-spec-');
    host = new virtualFs.ScopedHost(new NodeJsAsyncHost(), normalize(root));
  });
  afterEach(done => {
    host.delete(normalize('/'))
      .subscribe({ complete() { done(); } });
  });

  it('can watch', done => {
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
  }, 10000000);
});
