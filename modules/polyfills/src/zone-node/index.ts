require('zone.js/dist/zone-node.js');

import {patchMethod, patchPrototype, patchClass, zoneSymbol} from './utils';

const set = 'set';
const clear = 'clear';
const _global = typeof window === 'undefined' ? global : window;

// Timers
const timers = require('timers');
patchTimer(timers, set, clear, 'Timeout');
patchTimer(timers, set, clear, 'Interval');
patchTimer(timers, set, clear, 'Immediate');

var shouldPatchGlobalTimers = global.setTimeout !== timers.setTimeout;

if (shouldPatchGlobalTimers) {
  patchTimer(_global, set, clear, 'Timeout');
  patchTimer(_global, set, clear, 'Interval');
  patchTimer(_global, set, clear, 'Immediate');
}


// Crypto
var crypto;
try {
  crypto = require('crypto');
} catch (err) {}

// TODO(gdi2290): implement a better way to patch these methods
if (crypto) {
  let nativeRandomBytes = crypto.randomBytes;
  crypto.randomBytes = function randomBytesZone(size: number, callback?: Function) {
    if (!callback) {
      return nativeRandomBytes(size);
    } else {
      let zone = Zone.current;
      var source = crypto.constructor.name + '.randomBytes';
      return nativeRandomBytes(size, zone.wrap(callback, source));
    }
  }.bind(crypto);

  let nativePbkdf2 = crypto.pbkdf2;
  crypto.pbkdf2 = function pbkdf2Zone(...args) {
    let fn = args[args.length - 1];
    if (typeof fn === 'function') {
      let zone = Zone.current;
      var source = crypto.constructor.name + '.pbkdf2';
      args[args.length - 1] = zone.wrap(fn, source);
      return nativePbkdf2(...args);
    } else {
      return nativePbkdf2(...args);
    }
  }.bind(crypto);
}

// zone types
interface TaskData {
  isPeriodic?: boolean;
  delay?: number;
}
interface Task {
  type: TaskType;
  source: string;
  invoke: Function;
  callback: Function;
  data: TaskData;
  scheduleFn: (task: Task) => void;
  cancelFn: (task: Task) => void;
  zone: Zone;
  runCount: number;
}
// end zone types

interface TimerOptions extends TaskData {
  handleId: number;
  args: any[];
}



function patchTimer(
    window: any,
    setName: string,
    cancelName: string,
    nameSuffix: string) {

  setName += nameSuffix;
  cancelName += nameSuffix;
  var setNative;
  var clearNative;

  function scheduleTask(task: Task) {
    var data = <TimerOptions>task.data;
    data.args[0] = task.invoke;
    data.handleId = setNative.apply(window, data.args);
    return task;
  }

  function clearTask(task: Task) {
    return clearNative((<TimerOptions>task.data).handleId);
  }

  setNative = patchMethod(window, setName, (delegate: Function) => function(self: any, args: any[]) {
    if (typeof args[0] === 'function') {
      var zone = Zone.current;
      var options: TimerOptions = {
        handleId: null,
        isPeriodic: nameSuffix === 'Interval',
        delay: (nameSuffix === 'Timeout' || nameSuffix === 'Interval') ? args[1] || 0 : null,
        args: args
      };
      return zone.scheduleMacroTask(setName, args[0], options, scheduleTask, clearTask);
    } else {
      // cause an error by calling it directly.
      return delegate.apply(window, args);
    }
  });

  clearNative = patchMethod(window, cancelName, (delegate: Function) => function(self: any, args: any[]) {
    var task: Task = args[0];
    if (task && typeof task.type === 'string') {
      if (task.cancelFn && task.data.isPeriodic || task.runCount === 0) {
        // Do not cancel already canceled functions
        task.zone.cancelTask(task);
      }
    } else {
      // cause an error by calling it directly.
      delegate.apply(window, args);
    }
  });
}



require('zone.js/dist/long-stack-trace-zone');
