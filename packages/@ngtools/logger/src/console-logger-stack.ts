import {Logger} from './logger';

let globalConsoleStack: Logger[] = null;
let originalConsoleDebug: (message?: any, ...optionalParams: any[]) => void;
let originalConsoleLog: (message?: any, ...optionalParams: any[]) => void;
let originalConsoleWarn: (message?: any, ...optionalParams: any[]) => void;
let originalConsoleError: (message?: any, ...optionalParams: any[]) => void;


function _push(logger: Logger) {
  if (globalConsoleStack.length == 0) {
    originalConsoleDebug = (console as any).debug;  // Some environment (node) don't have debug.
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;

    (console as any).debug = (msg: string, ...args: any[]) => {
      globalConsoleStack[globalConsoleStack.length - 1].debug(msg, { args });
    };
    console.log = (msg: string, ...args: any[]) => {
      globalConsoleStack[globalConsoleStack.length - 1].info(msg, { args });
    };
    console.warn = (msg: string, ...args: any[]) => {
      globalConsoleStack[globalConsoleStack.length - 1].warn(msg, { args });
    };
    console.error = (msg: string, ...args: any[]) => {
      globalConsoleStack[globalConsoleStack.length - 1].error(msg, { args });
    };
  }
  globalConsoleStack.push(logger);

  return logger;
}

function _pop() {
  globalConsoleStack[globalConsoleStack.length - 1].complete();
  globalConsoleStack.pop();
  if (globalConsoleStack.length == 0) {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    (console as any).debug = originalConsoleDebug;  // Some environment (node) don't have debug.
    globalConsoleStack = null;
  }
}


export type LoggerConstructor<T extends Logger> = {
  new (...args: any[]): T;
};


export class ConsoleLoggerStack {
  static push(name: string): Logger;
  static push(logger: Logger): Logger;
  static push<T extends Logger>(loggerClass: LoggerConstructor<T>, ...args: any[]): Logger;
  static push<T extends Logger>(nameOrLogger: string | Logger | LoggerConstructor<T> = '',
                                ...args: any[]) {
    if (typeof nameOrLogger == 'string') {
      return _push(new Logger(nameOrLogger as string, this.top()));
    } else if (nameOrLogger instanceof Logger) {
      const logger = nameOrLogger as Logger;
      if (logger.parent !== this.top()) {
        throw new Error('Pushing a logger that is not a direct child of the top of the stack.');
      }
      return _push(logger);
    } else {
      const klass = nameOrLogger as LoggerConstructor<T>;
      return _push(new klass(...args, this.top()));
    }
  }
  static pop(): Logger | null {
    _pop();
    return this.top();
  }

  static top(): Logger | null {
    return globalConsoleStack && globalConsoleStack[globalConsoleStack.length - 1];
  }

  static start(name: string): Logger;
  static start(logger: Logger): Logger;
  static start<T extends Logger>(loggerClass: LoggerConstructor<T>, ...args: any[]): Logger;
  static start<T extends Logger>(nameOrLogger: string | Logger | LoggerConstructor<T> = '',
                                ...args: any[]) {
    if (globalConsoleStack !== null) {
      throw new Error('Cannot start a new console logger stack while one is already going.');
    }

    globalConsoleStack = [];
    if (typeof nameOrLogger == 'string') {
      return _push(new Logger(nameOrLogger as string, this.top()));
    } else if (nameOrLogger instanceof Logger) {
      return _push(nameOrLogger as Logger);
    } else {
      const klass = nameOrLogger as LoggerConstructor<T>;
      return _push(new klass(...args, this.top()));
    }
  }
  static end() {
    while (globalConsoleStack !== null) {
      this.pop();
    }
  }
}
