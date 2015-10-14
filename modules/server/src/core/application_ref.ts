/// <reference path="../../typings/tsd.d.ts" />
import {
  Injector,
  bind,
  OpaqueToken,
  Binding,
  Type,
  DynamicComponentLoader,
  ComponentRef,
  PlatformRef,
  ApplicationRef,
  NgZone,
  LifeCycle
} from 'angular2/angular2';

import {
  APP_COMPONENT_REF_PROMISE,
  APP_COMPONENT
} from 'angular2/src/core/application_tokens';

import {ExceptionHandler} from 'angular2/src/core/facade/exceptions';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {internalView} from 'angular2/src/core/linker/view_ref';
import {
  PromiseWrapper,
  PromiseCompleter
} from 'angular2/src/core/facade/async';
import {ListWrapper} from 'angular2/src/core/facade/collection';
import {
  NumberWrapper,
  isBlank,
  isPresent,
  assertionsEnabled,
  print,
  stringify
} from 'angular2/src/core/facade/lang';

import {Reflector, reflector} from 'angular2/src/core/reflection/reflection';
import {TestabilityRegistry, Testability} from 'angular2/src/core/testability/testability';


import {platformBindings, createNgZone} from 'angular2/src/core/application_ref';

export {
  PlatformRef,
  platformBindings,
  createNgZone
}

function _componentBindings(appComponentType: Type): Array<Type | Binding | any[]> {
  return [
    bind(APP_COMPONENT).toValue(appComponentType),

    bind(APP_COMPONENT_REF_PROMISE)
      .toFactory((dynamicComponentLoader, injector: Injector) => {
        // TODO(rado): investigate whether to support bindings on root component.
        return dynamicComponentLoader.loadAsRoot(appComponentType, null, injector)
          .then(componentRef => {
            if (isPresent(componentRef.location.nativeElement)) {
              injector.get(TestabilityRegistry)
                .registerApplication(componentRef.location.nativeElement,
                                     injector.get(Testability));
            }
            return componentRef;
          });
      },
      [DynamicComponentLoader, Injector]),

    bind(appComponentType)
      .toFactory((p: Promise<any>) => p.then(ref => ref.instance), [APP_COMPONENT_REF_PROMISE]),
  ];
}

// TODO: more than one instance
var _platform: PlatformRef;

export function platformCommon(bindings?: Array<Type | Binding | any[]>, initializer?: () => void):
    PlatformRef {
  if (isPresent(_platform)) {
    if (isBlank(bindings)) {
      return _platform;
    }
    throw "platform() can only be called once per page";
  }

  if (isPresent(initializer)) {
    initializer();
  }

  if (isBlank(bindings)) {
    bindings = platformBindings();
  }
  _platform = new PlatformRef_(Injector.resolveAndCreate(bindings), () => { _platform = null; });
  return _platform;
}


export class PlatformRef_ extends PlatformRef {
  _applications: ApplicationRef[] = [];

  constructor(private _injector: Injector, private _dispose: () => void) { super(); }

  get injector(): Injector { return this._injector; }

  application(bindings: Array<Type | Binding | any[]>): ApplicationRef {
    var app = this._initApp(createNgZone(), bindings);
    return app;
  }

  asyncApplication(bindingFn: (zone: NgZone) =>
                       Promise<Array<Type | Binding | any[]>>): Promise<ApplicationRef> {
    var zone = createNgZone();
    var completer = PromiseWrapper.completer();
    zone.run(() => {
      PromiseWrapper.then(bindingFn(zone), (bindings: Array<Type | Binding | any[]>) => {
        completer.resolve(this._initApp(zone, bindings));
      });
    });
    return completer.promise;
  }

  private _initApp(zone: NgZone, bindings: Array<Type | Binding | any[]>): ApplicationRef {
    var injector: Injector;
    zone.run(() => {
      bindings.push(bind(NgZone).toValue(zone));
      bindings.push(bind(ApplicationRef).toValue(this));

      var exceptionHandler;
      try {
        injector = this.injector.resolveAndCreateChild(bindings);
        exceptionHandler = injector.get(ExceptionHandler);
        zone.overrideOnErrorHandler((e, s) => exceptionHandler.call(e, s));
      } catch (e) {
        console.log('WAT')
        if (isPresent(exceptionHandler)) {
          exceptionHandler.call(e, e.stack);
        } else {
          DOM.logError(e);
        }
      }
    });
    var app = new ApplicationRef_(this, zone, injector);
    this._applications.push(app);
    return app;
  }

  dispose(): void {
    this._applications.forEach((app) => app.dispose());
    this._dispose();
  }

  _applicationDisposed(app: ApplicationRef): void { ListWrapper.remove(this._applications, app); }
}


export class ApplicationRef_ extends ApplicationRef {
  private _bootstrapListeners: Function[] = [];
  private _rootComponents: ComponentRef[] = [];

  constructor(
    private _platform: PlatformRef_,
    private _zone: NgZone,
    private _injector: Injector) {
    super();
  }

  registerBootstrapListener(listener: (ref: ComponentRef) => void): void {
    this._bootstrapListeners.push(listener);
  }

  bootstrap(componentType: Type, bindings?: Array<Type | Binding | any[]>): Promise<ComponentRef> {
    var completer = PromiseWrapper.completer();
    this._zone.run(() => {
      var componentBindings = _componentBindings(componentType);
      if (isPresent(bindings)) {
        componentBindings.push(bindings);
      }
      var exceptionHandler = this._injector.get(ExceptionHandler);
      try {

        var injector: Injector = this._injector.resolveAndCreateChild(componentBindings);

        var compRefToken: Promise<ComponentRef> = injector.get(APP_COMPONENT_REF_PROMISE);

        var tick = (componentRef) => {
          var appChangeDetector = internalView(componentRef.hostView).changeDetector;
          var lc = injector.get(LifeCycle);
          lc.registerWith(this._zone, appChangeDetector);
          lc.tick();
          completer.resolve(componentRef);
          this._rootComponents.push(componentRef);
          this._bootstrapListeners.forEach((listener) => listener(componentRef));
        };

        var tickResult = PromiseWrapper.then(compRefToken, tick);

        PromiseWrapper.then(tickResult, (_) => {});
        PromiseWrapper.then(tickResult, null,
                            (err, stackTrace) => completer.reject(err, stackTrace));
      } catch (e) {
        exceptionHandler.call(e, e.stack);
        completer.reject(e, e.stack);
      }
    });
    return completer.promise;
  }

  get injector(): Injector { return this._injector; }

  get zone(): NgZone { return this._zone; }

  dispose(): void {
    // TODO(alxhub): Dispose of the NgZone.
    this._rootComponents.forEach((ref) => ref.dispose());
    this._platform._applicationDisposed(this);
  }
}
