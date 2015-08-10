/* tslint:disable */

import {Injector, bind, OpaqueToken, Binding} from 'angular2/di';
import {
  NumberWrapper,
  Type,
  isBlank,
  isPresent,
  BaseException,
  assertionsEnabled,
  print,
  stringify,
  isDart
} from 'angular2/src/facade/lang';
import {BrowserDomAdapter} from 'angular2/src/dom/browser_adapter';
import {DOM} from 'angular2/src/dom/dom_adapter';

// correct path
import {Compiler, CompilerCache} from 'angular2/src/core/compiler/compiler';
//

import {Reflector, reflector} from 'angular2/src/reflection/reflection';
import {
  Parser,
  Lexer,
  ChangeDetection,
  DynamicChangeDetection,
  JitChangeDetection,
  PreGeneratedChangeDetection,
  Pipes,
  defaultPipes,
  IterableDiffers,
  defaultIterableDiffers,
  KeyValueDiffers,
  defaultKeyValueDiffers
} from 'angular2/src/change_detection/change_detection';

// correct path
import {ExceptionHandler} from 'angular2/src/core/exception_handler';
//

import {ViewLoader} from 'angular2/src/render/dom/compiler/view_loader';
import {StyleUrlResolver} from 'angular2/src/render/dom/compiler/style_url_resolver';
import {StyleInliner} from 'angular2/src/render/dom/compiler/style_inliner';

// correct path
import {ViewResolver} from 'angular2/src/core/compiler/view_resolver';
//


// correct path
import {DirectiveResolver} from 'angular2/src/core/compiler/directive_resolver';
//

import {List, ListWrapper} from 'angular2/src/facade/collection';
import {Promise, PromiseWrapper, PromiseCompleter} from 'angular2/src/facade/async';
import {NgZone} from 'angular2/src/core/zone/ng_zone';
import {LifeCycle} from 'angular2/src/core/life_cycle/life_cycle';
// import {ShadowDomStrategy} from 'angular2/src/render/dom/shadow_dom/shadow_dom_strategy';
// import {
  // EmulatedUnscopedShadowDomStrategy
// } from 'angular2/src/render/dom/shadow_dom/emulated_unscoped_shadow_dom_strategy';
import {XHR} from 'angular2/src/render/xhr';
import {XHRImpl} from 'angular2/src/render/xhr_impl';
import {EventManager, DomEventsPlugin} from 'angular2/src/render/dom/events/event_manager';
import {KeyEventsPlugin} from 'angular2/src/render/dom/events/key_events';
import {HammerGesturesPlugin} from 'angular2/src/render/dom/events/hammer_gestures';
import {ComponentUrlMapper} from 'angular2/src/core/compiler/component_url_mapper';
import {UrlResolver} from 'angular2/src/services/url_resolver';
import {AppRootUrl} from 'angular2/src/services/app_root_url';
import {AnchorBasedAppRootUrl} from 'angular2/src/services/anchor_based_app_root_url';
import {
  ComponentRef,
  DynamicComponentLoader
} from 'angular2/src/core/compiler/dynamic_component_loader';
import {TestabilityRegistry, Testability} from 'angular2/src/core/testability/testability';
import {AppViewPool, APP_VIEW_POOL_CAPACITY} from 'angular2/src/core/compiler/view_pool';
import {AppViewManager} from 'angular2/src/core/compiler/view_manager';
import {AppViewManagerUtils} from 'angular2/src/core/compiler/view_manager_utils';
import {AppViewListener} from 'angular2/src/core/compiler/view_listener';
import {ProtoViewFactory} from 'angular2/src/core/compiler/proto_view_factory';
import {Renderer, RenderCompiler} from 'angular2/src/render/api';
import {
  DomRenderer,
  DOCUMENT_TOKEN,
  DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES,
  DefaultDomCompiler,
  APP_ID_RANDOM_BINDING,
  MAX_IN_MEMORY_ELEMENTS_PER_TEMPLATE_TOKEN,
  TemplateCloner
} from 'angular2/src/render/render';
import {ElementSchemaRegistry} from 'angular2/src/render/dom/schema/element_schema_registry';
import {DomElementSchemaRegistry} from 'angular2/src/render/dom/schema/dom_element_schema_registry';
import {
  SharedStylesHost,
  DomSharedStylesHost
} from 'angular2/src/render/dom/view/shared_styles_host';
import {internalView} from 'angular2/src/core/compiler/view_ref';

import {appComponentRefPromiseToken, appComponentTypeToken} from 'angular2/src/core/application_tokens';
import {wtfInit} from 'angular2/src/profile/wtf_init';

// Server
import {ElementRef} from 'angular2/src/core/compiler/element_ref';
// Server

var _rootInjector: Injector;

// Contains everything that is safe to share between applications.
var _rootBindings = [ bind(Reflector).toValue(reflector), TestabilityRegistry ];

function _injectorBindings(appComponentType): List<Type | Binding | List<any>> {
  var bestChangeDetection: Type = DynamicChangeDetection;
  // if (PreGeneratedChangeDetection.isSupported()) {
  //   bestChangeDetection = PreGeneratedChangeDetection;
  // } else if (JitChangeDetection.isSupported()) {
  //   bestChangeDetection = JitChangeDetection;
  // }
  return [
    // bind(DOCUMENT_TOKEN)
    //     .toValue(DOM.defaultDoc()),
    // bind(DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES).toValue(false),
    // bind(appComponentTypeToken).toValue(appComponentType),
    // bind(appComponentRefPromiseToken)
    //     .toFactory(
    //         (dynamicComponentLoader, injector, testability, registry) => {
    //           // TODO(rado): investigate whether to support bindings on root component.
    //           return dynamicComponentLoader.loadAsRoot(appComponentType, null, injector)
    //               .then((componentRef) => {
    //                 registry.registerApplication(componentRef.location.nativeElement, testability);
    //                 return componentRef;
    //               });
    //         },
    //         [DynamicComponentLoader, Injector, Testability, TestabilityRegistry]),

    bind(appComponentType)
        .toFactory(p => p.then(ref => ref.instance), [appComponentRefPromiseToken]),
    bind(LifeCycle).toFactory((exceptionHandler) => new LifeCycle(null, assertionsEnabled()),
                              [ExceptionHandler]),
    bind(EventManager)
        .toFactory(
            (ngZone) => {
              var plugins =
                  [new HammerGesturesPlugin(), new KeyEventsPlugin(), new DomEventsPlugin()];
              return new EventManager(plugins, ngZone);
            },
            [NgZone]),
    DomRenderer,
    bind(Renderer).toAlias(DomRenderer),
    APP_ID_RANDOM_BINDING,
    bind(MAX_IN_MEMORY_ELEMENTS_PER_TEMPLATE_TOKEN).toValue(20),
    TemplateCloner,
    DefaultDomCompiler,
    bind(ElementSchemaRegistry).toValue(new DomElementSchemaRegistry()),
    bind(RenderCompiler).toAlias(DefaultDomCompiler),
    DomSharedStylesHost,
    bind(SharedStylesHost).toAlias(DomSharedStylesHost),
    ProtoViewFactory,
    AppViewPool,
    bind(APP_VIEW_POOL_CAPACITY).toValue(10000),
    AppViewManager,
    AppViewManagerUtils,
    AppViewListener,
    Compiler,
    CompilerCache,
    ViewResolver,
    defaultPipes,
    bind(IterableDiffers).toValue(defaultIterableDiffers),
    bind(KeyValueDiffers).toValue(defaultKeyValueDiffers),
    bind(ChangeDetection).toClass(bestChangeDetection),
    ViewLoader,
    DirectiveResolver,
    Parser,
    Lexer,
    bind(ExceptionHandler).toFactory(() => new ExceptionHandler(DOM, isDart ? false : true), []),
    bind(XHR).toValue(new XHRImpl()),
    ComponentUrlMapper,
    UrlResolver,
    StyleUrlResolver,
    StyleInliner,
    DynamicComponentLoader,
    Testability,
    AnchorBasedAppRootUrl,
    bind(AppRootUrl).toAlias(AnchorBasedAppRootUrl)
  ];
}

export function createNgZone(handler: ExceptionHandler): NgZone {
  // bootstrapErrorReporter is needed because we cannot use custom exception handler
  // configured via DI until the root Injector has been created.
  var bootstrapErrorReporter = (exception, stackTrace) => handler.call(exception, stackTrace);
  var zone = new NgZone({enableLongStackTrace: assertionsEnabled()});
  // zone.overrideOnErrorHandler(bootstrapErrorReporter);
  return zone;
}



export function bootstrap(appComponentType: Type,
                          componentInjectableBindings: List<Binding> = null,
                          appInjector: any = null,
                          appDocument: any = null): Promise {
  wtfInit();
  let bootstrapProcess = PromiseWrapper.completer();

  // TODO(rado): prepopulate template cache, so applications with only
  // index.html and main.js are possible.
  let __zone = createNgZone(new ExceptionHandler(DOM, isDart ? false : true));


  try {

    let bindingsCmpLoader = [DynamicComponentLoader, Injector, Testability, TestabilityRegistry];
    let componentLoader   = (dynamicComponentLoader, injector, testability, registry) => {
      // TODO(rado): investigate whether to support bindings on root component.
      return dynamicComponentLoader.loadAsRoot(appComponentType, null, injector).
        then(componentRef => {
          registry.registerApplication(componentRef.location.nativeElement, testability);
          return componentRef;
        });
    };

    let serverBindings = [
      // bind(appComponentRefToken).toFactory(componentLoader, bindingsCmpLoader)
    ];

    // Server
    let mergedBindings = isPresent(componentInjectableBindings) ?
      ListWrapper.concat(componentInjectableBindings, serverBindings) : serverBindings;

    if (!appInjector) {

      appInjector = _createAppInjector(appComponentType, mergedBindings, __zone);

    } else {

      appInjector.resolveAndCreateChild(mergedBindings);
      // appInjector.resolveAndCreateChild(mergedBindings.push([
      //   bind(NgZone).toValue(__zone)
      // ]));

    }
    let exceptionHandler = appInjector.get(ExceptionHandler);
    __zone.overrideOnErrorHandler((e, s) => exceptionHandler.call(e, s));

    // Server
    let compRefToken = PromiseWrapper.all([
      PromiseWrapper.wrap(() => appInjector.get(DynamicComponentLoader)),
      PromiseWrapper.wrap(() => appInjector.get(Testability)),
      PromiseWrapper.wrap(() => appInjector.get(TestabilityRegistry))
    ])
    .then(results => {
      return componentLoader(results[0], appInjector, results[1], results[2]);
    });

    let tick = componentRef => {
      var appChangeDetector = internalView(componentRef.hostView).changeDetector;
      // retrieve life cycle: may have already been created if injected in root component
      // var lc = appInjector.get(LifeCycle);
      // lc.registerWith(__zone, appChangeDetector);
      // lc.tick();

      bootstrapProcess.resolve(
        new ApplicationRef(componentRef, appComponentType, appInjector, appChangeDetector)
      );
    };

    var tickResult = PromiseWrapper.then(compRefToken, tick);

    PromiseWrapper.then(tickResult,
                        (_) => {});  // required for Dart to trigger the default error handler
    PromiseWrapper.then(tickResult, null,
                        (err, stackTrace) => { bootstrapProcess.reject(err, stackTrace); });

  } catch (e) {
    bootstrapProcess.reject(e, e.stack);
  }
  // Server
  return bootstrapProcess.promise;
}

export class ApplicationRef {
  _hostComponent:ComponentRef;
  _hostComponentType:Type;
  _hostElementRef:ElementRef;
  _injector:Injector;
  _changeDetection:ChangeDetection;
  constructor(
    hostComponent:ComponentRef, hostComponentType:Type, injector:Injector, changeDetection: ChangeDetection) {
    this._hostComponent = hostComponent;
    this._injector = injector;
    this._hostComponentType = hostComponentType;
    // Server
    this._changeDetection = changeDetection;
    // Server
  }

  get hostComponentType() {
    return this._hostComponentType;
  }

// Server
  get hostElementRef() {
    return this._hostComponent.location;
  }

  get changeDetection() {
    return this._changeDetection;
  }
// Server

  get hostComponent() {
    return this._hostComponent.instance;
  }

  get injector() {
    return this._injector;
  }

  dispose() {
    // Server
    this._injector = null;
    this._changeDetection = null;
    // Server

    // TODO: We also need to clean up the Zone, ... here!
    return this._hostComponent.dispose();
  }
}

function _createAppInjector(appComponentType: Type, bindings: List<Type | Binding | List<any>>,
                            zone: NgZone): Injector {
  if (isBlank(_rootInjector)) {
    _rootInjector = Injector.resolveAndCreate(_rootBindings);
  }

  var mergedBindings: any = isPresent(bindings) ?
    ListWrapper.concat(_injectorBindings(appComponentType), bindings) :
                                   _injectorBindings(appComponentType);

  mergedBindings.push(bind(NgZone).toValue(zone));

  // detech which binding is undefined
  // mergedBindings.map((binding, i) => {
  //   if (binding === undefined) {
  //     console.log('RENDER', i, mergedBindings[i-1]);
  //     // debugger;
  //   }
  // });

  return _rootInjector.resolveAndCreateChild(mergedBindings);
}
