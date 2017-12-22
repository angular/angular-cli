/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { filter, map, toArray } from 'rxjs/operators';
import { LogEntry } from './logger';
import { TransformLogger } from './transform-logger';


describe('TransformLogger', () => {
  it('works', (done: DoneFn) => {
    const logger = new TransformLogger('test', stream => {
      return stream.pipe(
        filter(entry => entry.message != 'hello'),
        map(entry => (entry.message += '1', entry)));
    });
    logger.pipe(toArray())
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'world1', level: 'info', name: 'test' }) as any,
        ]);
      })
      .then(() => done(), err => done.fail(err));

    logger.debug('hello');
    logger.info('world');
    logger.complete();
  });
});
