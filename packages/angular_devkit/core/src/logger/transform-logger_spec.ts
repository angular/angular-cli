/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {TransformLogger} from './transform-logger';
import {LogEntry} from './logger';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';


describe('TransformLogger', () => {
  it('works', (done: DoneFn) => {
    const logger = new TransformLogger('test', stream => {
      return stream
        .filter(entry => entry.message != 'hello')
        .map(entry => {
          entry.message += '1';
          return entry;
        });
    });
    logger
      .toArray()
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'world1', level: 'info', name: 'test' }) as any,
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    logger.debug('hello');
    logger.info('world');
    logger.complete();
  });
});
