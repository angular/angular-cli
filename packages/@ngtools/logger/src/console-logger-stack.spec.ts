import {LogEntry, Logger} from './logger';
import {ConsoleLoggerStack} from './console-logger-stack';
import {NullLogger} from './null-logger';


describe('ConsoleLoggerStack', () => {
  it('works', (done: DoneFn) => {
    const logger = ConsoleLoggerStack.start('test');
    logger
      .toArray()
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'hello', level: 'debug', name: 'test' }),
          jasmine.objectContaining({ message: 'world', level: 'info', name: 'test' }),
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    (console as any).debug('hello');
    console.log('world');
    ConsoleLoggerStack.end();
  });

  it('works as a stack', (done: DoneFn) => {
    const oldConsoleLog = console.log;
    const logger = ConsoleLoggerStack.start('test');
    expect(console.log).not.toBe(oldConsoleLog);
    logger
      .toArray()
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'red', level: 'info', name: 'test' }),
          jasmine.objectContaining({ message: 'blue', level: 'info', name: 'test2' }),
          jasmine.objectContaining({ message: 'yellow', level: 'info', name: 'test3' }),
          jasmine.objectContaining({ message: 'green', level: 'info', name: 'test2' }),
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    console.log('red');
    ConsoleLoggerStack.push('test2');
    console.log('blue');
    ConsoleLoggerStack.push('test3');
    console.log('yellow');
    ConsoleLoggerStack.pop();
    console.log('green');
    ConsoleLoggerStack.end();
    expect(console.log).toBe(oldConsoleLog);
  });

  it('can push instances or classes', (done: DoneFn) => {
    const oldConsoleLog = console.log;
    const logger = new Logger('test');
    ConsoleLoggerStack.start(logger);
    expect(console.log).not.toBe(oldConsoleLog);
    logger
      .toArray()
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'red', level: 'info', name: 'test' }),
          jasmine.objectContaining({ message: 'green', level: 'info', name: 'test2' }),
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    console.log('red');
    ConsoleLoggerStack.push(new NullLogger(logger));
    console.log('blue');
    ConsoleLoggerStack.pop();
    ConsoleLoggerStack.push(new Logger('test2', logger));
    console.log('green');
    ConsoleLoggerStack.end();
    expect(console.log).toBe(oldConsoleLog);
  });
});
