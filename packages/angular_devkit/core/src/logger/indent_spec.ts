/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { toArray } from 'rxjs/operators';
import { IndentLogger } from './indent';
import { LogEntry, Logger } from './logger';


describe('IndentSpec', () => {
  it('works', (done: DoneFn) => {
    const logger = new IndentLogger('test');
    logger.pipe(toArray())
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'test', level: 'info', name: 'test' }) as any,
          jasmine.objectContaining({ message: '  test2', level: 'info', name: 'test2' }) as any,
          jasmine.objectContaining({ message: '    test3', level: 'info', name: 'test3' }) as any,
          jasmine.objectContaining({ message: '  test4', level: 'info', name: 'test4' }) as any,
          jasmine.objectContaining({ message: 'test5', level: 'info', name: 'test' }) as any,
        ]);
      })
      .then(() => done(), err => done.fail(err));
    const logger2 = new Logger('test2', logger);
    const logger3 = new Logger('test3', logger2);
    const logger4 = new Logger('test4', logger);

    logger.info('test');
    logger2.info('test2');
    logger3.info('test3');
    logger4.info('test4');
    logger.info('test5');

    logger.complete();
  });
});
