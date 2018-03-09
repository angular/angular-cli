import {NullLogger} from './null-logger';
import {LogEntry, Logger} from './logger';
import {toArray} from 'rxjs/operators';


describe('NullLogger', () => {
  it('works', (done: DoneFn) => {
    const logger = new NullLogger();
    logger.pipe(toArray())
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    logger.debug('hello');
    logger.info('world');
    logger.complete();
  });

  it('nullifies children', (done: DoneFn) => {
    const logger = new Logger('test');
    logger.pipe(toArray())
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    const nullLogger = new NullLogger(logger);
    const child = new Logger('test', nullLogger);
    child.debug('hello');
    child.info('world');
    logger.complete();
  });
});
