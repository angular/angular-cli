import {LogEntry, Logger} from './logger';
import {IndentLogger} from './indent';


describe('IndentSpec', () => {
  it('works', (done: DoneFn) => {
    const logger = new IndentLogger('test');
    logger
      .toArray()
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'test', level: 'info', name: 'test' }),
          jasmine.objectContaining({ message: '  test2', level: 'info', name: 'test2' }),
          jasmine.objectContaining({ message: '    test3', level: 'info', name: 'test3' }),
          jasmine.objectContaining({ message: '  test4', level: 'info', name: 'test4' }),
          jasmine.objectContaining({ message: 'test5', level: 'info', name: 'test' }),
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));
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
