/**
 * Suppress closure compiler errors about unknown 'process' variable
 * @fileoverview
 * @suppress {undefinedVars}
 */

// Hack since TypeScript isn't compiling this for a worker.
declare var WorkerGlobalScope;
export var zoneSymbol: (name: string) => string = Zone['__symbol__'];

const _global = typeof window === 'undefined' ? global : window;

export function bindArguments(args: any[], source: string): any[] {
  for (var i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === 'function') {
      args[i] = Zone.current.wrap(args[i], source + '_' + i);
    }
  }
  return args;
};

export function patchPrototype(prototype, fnNames) {
  var source = prototype.constructor['name'];
  for (var i = 0; i < fnNames.length; i++) {
    var name = fnNames[i];
    var delegate = prototype[name];
    if (delegate) {
      prototype[name] = ((delegate: Function) => {
        return function() {
          return delegate.apply(this, bindArguments(<any>arguments, source + '.' + name));
        };
      })(delegate);
    }
  }
};

export var isWebWorker: boolean =
    (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);

export var isNode: boolean =
  (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]');

export var isBrowser: boolean =
    !isNode && !isWebWorker && !!(typeof window !== 'undefined' && window['HTMLElement']);


export function patchProperty(obj, prop) {
  var desc = Object.getOwnPropertyDescriptor(obj, prop) || {
    enumerable: true,
    configurable: true
  };

  // A property descriptor cannot have getter/setter and be writable
  // deleting the writable and value properties avoids this error:
  //
  // TypeError: property descriptors must not specify a value or be writable when a
  // getter or setter has been specified
  delete desc.writable;
  delete desc.value;

  // substr(2) cuz 'onclick' -> 'click', etc
  var eventName = prop.substr(2);
  var _prop = '_' + prop;

  desc.set = function (fn) {
    if (this[_prop]) {
      this.removeEventListener(eventName, this[_prop]);
    }

    if (typeof fn === 'function') {
      var wrapFn = function (event) {
        var result;
        result = fn.apply(this, arguments);

        if (result !== undefined && !result) {
          event.preventDefault();
        }
      };

      this[_prop] = wrapFn;
      this.addEventListener(eventName, wrapFn, false);
    } else {
      this[_prop] = null;
    }
  };

  desc.get = function () {
    return this[_prop];
  };

  Object.defineProperty(obj, prop, desc);
};

export function patchOnProperties(obj: any, properties: string[]) {
  var onProperties = [];
  for (var prop in obj) {
    if (prop.substr(0, 2) === 'on') {
      onProperties.push(prop);
    }
  }
  for (var j = 0; j < onProperties.length; j++) {
    patchProperty(obj, onProperties[j]);
  }
  if (properties) {
    for (var i = 0; i < properties.length; i++) {
      patchProperty(obj, 'on' + properties[i]);
    }
  }
};

const EVENT_TASKS = zoneSymbol('eventTasks');
const ADD_EVENT_LISTENER = 'addEventListener';
const REMOVE_EVENT_LISTENER = 'removeEventListener';
const SYMBOL_ADD_EVENT_LISTENER = zoneSymbol(ADD_EVENT_LISTENER);
const SYMBOL_REMOVE_EVENT_LISTENER = zoneSymbol(REMOVE_EVENT_LISTENER);

interface ListenerTaskMeta extends TaskData {
  useCapturing: boolean;
  eventName: string;
  handler: any;
  target: any;
  name: any;
}

function findExistingRegisteredTask(target: any, handler: any, name: string, capture: boolean,
                                    remove: boolean): Task {
  var eventTasks: Task[] = target[EVENT_TASKS];
  if (eventTasks) {
    for (var i = 0; i < eventTasks.length; i++) {
      var eventTask = eventTasks[i];
      var data = <ListenerTaskMeta>eventTask.data;
      if (data.handler === handler
          && data.useCapturing === capture
          && data.eventName === name) {

        if (remove) {
          eventTasks.splice(i, 1);
        }

        return eventTask;
      }
    }
  }
  return null;
}


function attachRegisteredEvent(target: any, eventTask: Task): void {
  var eventTasks: Task[] = target[EVENT_TASKS];
  if (!eventTasks) {
    eventTasks = target[EVENT_TASKS] = [];
  }
  eventTasks.push(eventTask);
}

function scheduleEventListener(eventTask: Task): any {
  var meta = <ListenerTaskMeta>eventTask.data;
  attachRegisteredEvent(meta.target, eventTask);
  return meta.target[SYMBOL_ADD_EVENT_LISTENER](meta.eventName, eventTask.invoke,
      meta.useCapturing);
}

function cancelEventListener(eventTask: Task): void {
  var meta = <ListenerTaskMeta>eventTask.data;
  findExistingRegisteredTask(meta.target, eventTask.invoke, meta.eventName,
      meta.useCapturing, true);
  meta.target[SYMBOL_REMOVE_EVENT_LISTENER](meta.eventName, eventTask.invoke,
      meta.useCapturing);
}

function zoneAwareAddEventListener(self: any, args: any[]) {
  var eventName: string = args[0];
  var handler: EventListenerOrEventListenerObject = args[1];
  var useCapturing: boolean = args[2] || false;
  // - Inside a Web Worker, `this` is undefined, the context is `global`
  // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
  // see https://github.com/angular/zone.js/issues/190
  var target = self || _global;
  var delegate: EventListener = null;
  if (typeof handler === 'function') {
    delegate = <EventListener>handler;
  } else if (handler && (<EventListenerObject>handler).handleEvent) {
    delegate = (event) => (<EventListenerObject>handler).handleEvent(event);
  }
  // Ignore special listeners of IE11 & Edge dev tools, see https://github.com/angular/zone.js/issues/150
  if (!delegate || handler && handler.toString() === "[object FunctionWrapper]") {
    return target[SYMBOL_ADD_EVENT_LISTENER](eventName, handler, useCapturing);
  }
  var eventTask: Task
      = findExistingRegisteredTask(target, handler, eventName, useCapturing, false);
  if (eventTask) {
    // we already registered, so this will have noop.
    return target[SYMBOL_ADD_EVENT_LISTENER](eventName, eventTask.invoke, useCapturing);
  }
  var zone: Zone = Zone.current;
  var source = target.constructor['name'] + '.addEventListener:' + eventName;
  var data: ListenerTaskMeta = {
    target: target,
    eventName: eventName,
    name: eventName,
    useCapturing: useCapturing,
    handler: handler
  };
  zone.scheduleEventTask(source, delegate, data, scheduleEventListener, cancelEventListener);
}

function zoneAwareRemoveEventListener(self: any, args: any[]) {
  var eventName: string = args[0];
  var handler: EventListenerOrEventListenerObject = args[1];
  var useCapturing: boolean = args[2] || false;
  // - Inside a Web Worker, `this` is undefined, the context is `global`
  // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
  // see https://github.com/angular/zone.js/issues/190
  var target = self || _global;
  var eventTask = findExistingRegisteredTask(target, handler, eventName, useCapturing, true);
  if (eventTask) {
    eventTask.zone.cancelTask(eventTask);
  } else {
    target[SYMBOL_REMOVE_EVENT_LISTENER](eventName, handler, useCapturing);
  }
}

export function patchEventTargetMethods(obj: any): boolean {
  if (obj && obj.addEventListener) {
    patchMethod(obj, ADD_EVENT_LISTENER, () => zoneAwareAddEventListener);
    patchMethod(obj, REMOVE_EVENT_LISTENER, () => zoneAwareRemoveEventListener);
    return true;
  } else {
    return false;
  }
};

var originalInstanceKey = zoneSymbol('originalInstance');

// wrap some native API on `window`
export function patchClass(className) {
  var OriginalClass = _global[className];
  if (!OriginalClass) { return; }

  _global[className] = function () {
    var a = bindArguments(<any>arguments, className);
    switch (a.length) {
      case 0: this[originalInstanceKey] = new OriginalClass(); break;
      case 1: this[originalInstanceKey] = new OriginalClass(a[0]); break;
      case 2: this[originalInstanceKey] = new OriginalClass(a[0], a[1]); break;
      case 3: this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2]); break;
      case 4: this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2], a[3]); break;
      default: throw new Error('Arg list too long.');
    }
  };

  var instance = new OriginalClass(function () {});

  var prop;
  for (prop in instance) {
    if (instance.hasOwnProperty(prop)) {
      (function (prop) {
        if (typeof instance[prop] === 'function') {
          _global[className].prototype[prop] = function () {
            return this[originalInstanceKey][prop].apply(this[originalInstanceKey], arguments);
          };
        } else {
          Object.defineProperty(_global[className].prototype, prop, {
            set: function (fn) {
              if (typeof fn === 'function') {
                this[originalInstanceKey][prop] = Zone.current.wrap(fn, className + '.' + prop);
              } else {
                this[originalInstanceKey][prop] = fn;
              }
            },
            get: function () {
              return this[originalInstanceKey][prop];
            }
          });
        }
      }(prop));
    }
  }

  for (prop in OriginalClass) {
    if (prop !== 'prototype' && OriginalClass.hasOwnProperty(prop)) {
      _global[className][prop] = OriginalClass[prop];
    }
  }
};

export function createNamedFn(
    name: string,
    delegate: (self: any, args: any[]) => any): Function {

  try {
    return (Function(
        'f',
        `return function ${name}(){return f(this, arguments)}`)
    )(delegate);
  } catch (e) {
    // if we fail, we must be CSP, just return delegate.
    return function() {
      return delegate(this, <any>arguments);
    };
  }
}

export function patchMethod(
  target: any,
  name: string,
  patchFn: (delegate: Function, delegateName: string, name: string) => (self: any, args: any[]) => any): Function {

  var proto = target;
  while (proto && !proto.hasOwnProperty(name)) {
    proto = Object.getPrototypeOf(proto);
  }
  if (!proto && target[name]) {
    // somehow we did not find it, but we can see it. This happens on IE for Window properties.
    proto = target;
  }
  var delegateName = zoneSymbol(name);
  var delegate: Function;
  if (proto && ! (delegate = proto[delegateName])) {
    delegate = proto[delegateName] = proto[name];
    proto[name] = createNamedFn(name, patchFn(delegate, delegateName, name));
  }
  return delegate;
}
