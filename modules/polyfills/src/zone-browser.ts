// ZONE.js workaround beta.10 beta.11

/* tslint:disable */

require('zone.js/lib/browser/browser');
var {eventTargetPatch} = require('zone.js/lib/browser/event-target');
var {propertyPatch} = require('zone.js/lib/browser/define-property');
var {registerElementPatch} = require('zone.js/lib/browser/register-element');
var {propertyDescriptorPatch} = require('zone.js/lib/browser/property-descriptor');
var {patchMethod, patchPrototype, patchClass} = require('zone.js/lib/browser/utils');

var set = 'set';
var clear = 'clear';
var blockingMethods = ['alert', 'prompt', 'confirm'];

patchTimer(global, set, clear, 'Timeout');
patchTimer(global, set, clear, 'Interval');
patchTimer(global, set, clear, 'Immediate');
patchTimer(global, 'request', 'cancelMacroTask', 'AnimationFrame');
patchTimer(global, 'mozRequest', 'mozCancel', 'AnimationFrame');
patchTimer(global, 'webkitRequest', 'webkitCancel', 'AnimationFrame')

for (var i = 0; i < blockingMethods.length; i++) {
  var name = blockingMethods[i];
  patchMethod(global, name, (delegate, symbol, name) => {
    return function (s:any, args: any[]) {
      return Zone.current.run(delegate, global, args, name)
    }
  });
}

eventTargetPatch(global);
propertyDescriptorPatch(global);
patchClass('MutationObserver');
patchClass('WebKitMutationObserver');
patchClass('FileReader');
propertyPatch();
registerElementPatch(global);

/// GEO_LOCATION
if (global['navigator'] && global['navigator'].geolocation) {
  patchPrototype(global['navigator'].geolocation, [
    'getCurrentPosition',
    'watchPosition'
  ]);
}

interface TimerOptions extends TaskData {
  handleId: number;
  args: any[]
}

function patchTimer(
    window: any,
    setName: string,
    cancelName: string,
    nameSuffix: string)
{
  setName += nameSuffix;
  cancelName += nameSuffix;

  function scheduleTask(task: Task) {
    var data = <TimerOptions>task.data;
    data.args[0] = task.invoke;
    data.handleId = setNative.apply(window, data.args);
    return task;
  }

  function clearTask(task: Task) {
    return clearNative((<TimerOptions>task.data).handleId);
  }

  var setNative = patchMethod(
    window,
    setName,
    (delegate: Function) => function(self: any, args: any[]) {
    if (typeof args[0] === 'function') {
      var zone = Zone.current;
      var options: TimerOptions = {
        handleId: null,
        isPeriodic: nameSuffix == 'Interval',
        delay: (nameSuffix == 'Timeout' || nameSuffix == 'Interval') ? args[1] || 0 : null,
        args: args
      };
      return zone.scheduleMacroTask(setName, args[0], options, scheduleTask, clearTask);
    } else {
      // cause an error by calling it directly.
      return delegate.apply(window, args);
    }
  });

  var clearNative = patchMethod(window, cancelName, (delegate: Function) => function(self: any, args: any[]) {
    var task: Task = args[0];
    if (task && typeof task.type == 'string') {
      task.zone.cancelTask(task);
    } else {
      // cause an error by calling it directly.
      delegate.apply(window, args);
    }
  });
}

// require('zone.js/dist/long-stack-trace-zone');

/* tslint:enable */
