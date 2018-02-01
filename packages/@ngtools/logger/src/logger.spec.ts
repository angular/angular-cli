import {Logger, JsonValue} from './logger';
import {toArray} from 'rxjs/operators';


describe('Logger', () => {
  it('works', (done: DoneFn) => {
    const logger = new Logger('test');
    logger.pipe(toArray())
      .toPromise()
      .then((observed: JsonValue[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'hello', level: 'debug', name: 'test' }),
          jasmine.objectContaining({ message: 'world', level: 'info', name: 'test' }),
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    logger.debug('hello');
    logger.info('world');
    logger.complete();
  });

  it('works with children', (done: DoneFn) => {
    const logger = new Logger('test');
    let hasCompleted = false;
    logger.pipe(toArray())
      .toPromise()
      .then((observed: JsonValue[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'hello', level: 'debug', name: 'child' }),
          jasmine.objectContaining({ message: 'world', level: 'info', name: 'child' }),
        ]);
        expect(hasCompleted).toBe(true);
      })
      .then(() => done(), (err: any) => done.fail(err));

    const childLogger = new Logger('child', logger);
    childLogger.subscribe(undefined, undefined, () => hasCompleted = true);
    childLogger.debug('hello');
    childLogger.info('world');
    logger.complete();
  });
});
