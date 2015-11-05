/// <reference path="../../typings/tsd.d.ts" />
import {
  Injector,
  provide,
  OpaqueToken,
  Provider,
  Type,
  ComponentRef,
  PlatformRef,
  ApplicationRef,
  NgZone
} from 'angular2/angular2';

import {
  APP_COMPONENT_REF_PROMISE,
  APP_COMPONENT,
  APP_ID_RANDOM_PROVIDER
} from 'angular2/src/core/application_tokens';

import {ExceptionHandler} from 'angular2/src/core/facade/exceptions';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {internalView} from 'angular2/src/core/linker/view_ref';
import {
  // Promise,
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

import {platformProviders, createNgZone} from 'angular2/src/core/application_ref';

export {
  PlatformRef,
  createNgZone,
  platformProviders
}


import {Compiler, Compiler_} from 'angular2/src/core/linker/compiler';
import {AppViewPool, APP_VIEW_POOL_CAPACITY} from 'angular2/src/core/linker/view_pool';
import {AppViewManager, AppViewManager_} from 'angular2/src/core/linker/view_manager';
import {AppViewManagerUtils} from 'angular2/src/core/linker/view_manager_utils';
import {AppViewListener} from 'angular2/src/core/linker/view_listener';
import {ProtoViewFactory} from 'angular2/src/core/linker/proto_view_factory';
import {ViewResolver} from 'angular2/src/core/linker/view_resolver';
import {DEFAULT_PIPES} from 'angular2/src/core/pipes';
import {LifeCycle, LifeCycle_} from 'angular2/src/core/life_cycle/life_cycle';
import {DirectiveResolver} from 'angular2/src/core/linker/directive_resolver';
import {PipeResolver} from 'angular2/src/core/linker/pipe_resolver';
import {DynamicComponentLoader, DynamicComponentLoader_} from "angular2/src/core/linker/dynamic_component_loader";

import {
  IterableDiffers,
  defaultIterableDiffers,
  KeyValueDiffers,
  defaultKeyValueDiffers
} from 'angular2/src/core/change_detection/change_detection';

export function applicationCommonProviders(): Array<Type | Provider | any[]> {
  return [
    provide(Compiler, {useClass: Compiler_}),
    APP_ID_RANDOM_PROVIDER,
    AppViewPool,
    provide(APP_VIEW_POOL_CAPACITY, {useValue: 10000}),
    provide(AppViewManager, {useClass: AppViewManager_}),
    AppViewManagerUtils,
    AppViewListener,
    DirectiveResolver,
    ViewResolver,
    PipeResolver,
    ProtoViewFactory,
    DEFAULT_PIPES,
    provide(IterableDiffers, {useValue: defaultIterableDiffers}),
    provide(KeyValueDiffers, {useValue: defaultKeyValueDiffers}),
    provide(DynamicComponentLoader, {useClass: DynamicComponentLoader_}),
    provide(LifeCycle, {
      useFactory: (exceptionHandler) => new LifeCycle_(null, assertionsEnabled()),
      deps: [ExceptionHandler]
    })
  ];
}


function _componentProviders(appComponentType: Type): Array<Type | Provider | any[]> {
  return [
    provide(APP_COMPONENT, {useValue: appComponentType}),

    provide(APP_COMPONENT_REF_PROMISE, {
      useFactory: (dynamicComponentLoader, injector: Injector) => {

        // TODO(rado): investigate whether to support providers on root component.
        return dynamicComponentLoader.loadAsRoot(appComponentType, null, injector).then(componentRef => {
            if (isPresent(componentRef.location.nativeElement)) {
              injector.get(TestabilityRegistry)
                .registerApplication(componentRef.location.nativeElement,
                                     injector.get(Testability));
            }
            return componentRef;
          })
          .catch(e => {
            return Promise.reject(e);
          });
      },
      deps: [DynamicComponentLoader, Injector]
    }),

    provide(appComponentType, {
      useFactory: (p: Promise<any>) => p.then(ref => ref.instance),
      deps: [APP_COMPONENT_REF_PROMISE]
    }),
  ];
}

// TODO: more than one instance
var _platform: PlatformRef;

export function platformCommon(providers?: Array<Type | Provider | any[]>, initializer?: () => void):
    PlatformRef {
  if (isPresent(_platform)) {
    if (isBlank(providers)) {
      return _platform;
    }
    throw "platform() can only be called once per page";
  }

  if (isPresent(initializer)) {
    initializer();
  }

  if (isBlank(providers)) {
    providers = platformProviders();
  }
  _platform = new PlatformRef_(Injector.resolveAndCreate(providers), () => { _platform = null; });
  return _platform;
}


export class PlatformRef_ extends PlatformRef {
  _applications: Array<ApplicationRef | ApplicationRef_ | any> = [];

  public componentTypes: Array<Type> = [];

  constructor(
    private _injector: Injector,
    private _dispose: () => void) {
    super();
  }

  get injector(): Injector {
    return this._injector;
  }

  application(providers: Array<Type | Provider | any[]>): ApplicationRef {
    var app = this._initApp(createNgZone(), providers);
    return app;
  }

  asyncApplication(bindingFn: (zone: NgZone) => Promise<Array<Type | Provider | any[]>>):
    Promise<ApplicationRef> {

    var zone = createNgZone();
    var completer = PromiseWrapper.completer();
    zone.run(() => {
      PromiseWrapper.then(bindingFn(zone), (providers: Array<Type | Provider | any[]>) => {
        completer.resolve(this._initApp(zone, providers));
      });
    });
    return completer.promise;
  }

  private _initApp(
    zone: NgZone,
    providers: Array<Type | Provider | any[]>): ApplicationRef {

    var injector: Injector;
    var app: ApplicationRef;
    zone.run(() => {
      providers.push(provide(NgZone, {useValue: zone}));
      providers.push(provide(ApplicationRef, {useValue: this}));

      var exceptionHandler;
      try {
        injector = this.injector.resolveAndCreateChild(providers);
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
    app = new ApplicationRef_(this, zone, injector);
    this._applications.push(app);
    return app;
  }

  dispose(): void {
    this._applications.forEach((app) => app.dispose());
    this._dispose();
  }

  _applicationDisposed(app: ApplicationRef): void {
    ListWrapper.remove(this._applications, app);
  }
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

  bootstrap(componentType: Type, providers?: Array<Type | Provider | any[]>): Promise<ComponentRef> {
    this._platform.componentTypes.push(componentType);

    var completer = PromiseWrapper.completer();
    this._zone.run(() => {
      var componentProviders = _componentProviders(componentType);
      if (isPresent(providers)) {
        componentProviders.push(providers);
      }
      var exceptionHandler = this._injector.get(ExceptionHandler);
      try {

        var injector: Injector = this._injector.resolveAndCreateChild(componentProviders);

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

  get injector(): Injector {
    return this._injector;
  }

  get zone(): NgZone {
    return this._zone;
  }

  dispose(): void {
    // TODO(alxhub): Dispose of the NgZone.
    this._rootComponents.forEach((ref) => ref.dispose());
    this._platform._applicationDisposed(this);
  }
}
