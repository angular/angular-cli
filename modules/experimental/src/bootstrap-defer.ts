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
  stringify
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
  defaultPipes
} from 'angular2/change_detection';

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
import {Promise, PromiseWrapper} from 'angular2/src/facade/async';
import {NgZone} from 'angular2/src/core/zone/ng_zone';
import {LifeCycle} from 'angular2/src/core/life_cycle/life_cycle';
import {ShadowDomStrategy} from 'angular2/src/render/dom/shadow_dom/shadow_dom_strategy';
import {
  EmulatedUnscopedShadowDomStrategy
} from 'angular2/src/render/dom/shadow_dom/emulated_unscoped_shadow_dom_strategy';
import {XHR} from 'angular2/src/render/xhr';
import {XHRImpl} from 'angular2/src/render/xhr_impl';
import {EventManager, DomEventsPlugin} from 'angular2/src/render/dom/events/event_manager';
import {KeyEventsPlugin} from 'angular2/src/render/dom/events/key_events';
import {HammerGesturesPlugin} from 'angular2/src/render/dom/events/hammer_gestures';
import {ComponentUrlMapper} from 'angular2/src/core/compiler/component_url_mapper';
import {UrlResolver} from 'angular2/src/services/url_resolver';
import {AppRootUrl} from 'angular2/src/services/app_root_url';
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
import {DomRenderer, DOCUMENT} from 'angular2/src/render/dom/dom_renderer';
import {DefaultDomCompiler} from 'angular2/src/render/dom/compiler/compiler';
import {internalView} from 'angular2/src/core/compiler/view_ref';

import {APP_COMPONENT_REF_PROMISE, APP_COMPONENT} from 'angular2/src/core/application_tokens';

// Server
import {ElementRef} from 'angular2/src/core/compiler/element_ref';
// Server

var _rootInjector: Injector;


// Contains everything that is safe to share between applications.
var _rootBindings = [bind(Reflector).toValue(reflector), TestabilityRegistry];

function _injectorBindings(appComponentType): List<Type | Binding | List<any>> {
  var bestChangeDetection: Type = DynamicChangeDetection;
  if (PreGeneratedChangeDetection.isSupported()) {
    bestChangeDetection = PreGeneratedChangeDetection;
  } else if (JitChangeDetection.isSupported()) {
    bestChangeDetection = JitChangeDetection;
  }

  return [
    bind(DOCUMENT)
        .toValue(DOM.defaultDoc()),
    bind(APP_COMPONENT).toValue(appComponentType),
    // bind(APP_COMPONENT_REF_PROMISE)
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

    bind(appComponentType).toFactory((ref) => ref.instance, [APP_COMPONENT_REF_PROMISE]),
    bind(LifeCycle)
        .toFactory((exceptionHandler) => new LifeCycle(exceptionHandler, null, assertionsEnabled()),
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
    DefaultDomCompiler,
    bind(Renderer).toAlias(DomRenderer),
    bind(RenderCompiler).toAlias(DefaultDomCompiler),
    ProtoViewFactory,
    AppViewPool,
    bind(APP_VIEW_POOL_CAPACITY).toValue(10000),
    AppViewManager,
    AppViewManagerUtils,
    AppViewListener,
    Compiler,
    CompilerCache,
    ViewResolver,
    bind(Pipes).toValue(defaultPipes),
    bind(ChangeDetection).toClass(bestChangeDetection),
    ViewLoader,
    DirectiveResolver,
    Parser,
    Lexer,
    ExceptionHandler,
    bind(XHR).toValue(new XHRImpl()),
    ComponentUrlMapper,
    UrlResolver,
    StyleUrlResolver,
    StyleInliner,
    DynamicComponentLoader,
    Testability,
    AppRootUrl,
    bind(APP_COMPONENT_REF_PROMISE).toFactory(
      (compiler, viewManager, injector, lifeCycle, testability, registry) => {
        var deferBootstrapProcess = PromiseWrapper.completer();
        function getBinding(typeOrBinding): Binding {
          var binding;
          if (typeOrBinding instanceof Binding) {
            binding = typeOrBinding;
          } else {
            binding = bind(typeOrBinding).toClass(typeOrBinding);
          }
          return binding;
        }

        return (
          compiler.compileInHost(getBinding(appComponentType))
          .then(hostProtoViewRef => {
            var deferBootstrapProcess = PromiseWrapper.completer();
            var deferedApp = deferBootstrapProcess.promise.
              then(hostProtoViewRef => {
                var hostViewRef = viewManager.createRootHostView(hostProtoViewRef, null, injector);
                var newLocation = new ElementRef(hostViewRef, 0);
                var component   = viewManager.getComponent(newLocation);

                var dispose = () => { viewManager.destroyRootHostView(hostViewRef); };
                return new ComponentRef(newLocation, component, dispose);
              }).
              then(componentRef => {
                registry.registerApplication(componentRef.location.nativeElement, testability);
                return componentRef;
              });


            return function deferApp(zone) {
              return function defer(callback) {
                deferBootstrapProcess.resolve(hostProtoViewRef);
                return deferedApp.then(componentRef => {
                  var appChangeDetector = internalView(componentRef.hostView).changeDetector;
                  // retrieve life cycle: may have already been created if injected in root component

                  lifeCycle.registerWith(zone, appChangeDetector);
                  callback(componentRef, appComponentType, injector, lifeCycle);
                  lifeCycle.tick();  // the first tick that will bootstrap the app

                  return new ApplicationRef(
                    componentRef,
                    appComponentType,
                    injector,
                    lifeCycle
                  );
                });
              }
            }
          })// compileInHost

        );
      },
      [Compiler, AppViewManager, Injector, LifeCycle, Testability, TestabilityRegistry]
    )
  ];
}


function _createNgZone(givenReporter: Function): NgZone {
  var defaultErrorReporter = (exception, stackTrace) => {
    var longStackTrace = ListWrapper.join(stackTrace, "\n\n-----async gap-----\n");
    DOM.logError(`${exception}\n\n${longStackTrace}`);
    throw exception;
  };

  var reporter = isPresent(givenReporter) ? givenReporter : defaultErrorReporter;

  var zone = new NgZone({enableLongStackTrace: assertionsEnabled()});
  zone.initCallbacks({onErrorHandler: reporter});
  return zone;
}

/**
 * Bootstrapping for Angular applications.
 *
 * You instantiate an Angular application by explicitly specifying a component to use as the root
 * component for your
 * application via the `bootstrap()` method.
 *
 * ## Simple Example
 *
 * Assuming this `index.html`:
 *
 * ```html
 * <html>
 *   <!-- load Angular script tags here. -->
 *   <body>
 *     <my-app>loading...</my-app>
 *   </body>
 * </html>
 * ```
 *
 * An application is bootstrapped inside an existing browser DOM, typically `index.html`. Unlike
 * Angular 1, Angular 2
 * does not compile/process bindings in `index.html`. This is mainly for security reasons, as well
 * as architectural
 * changes in Angular 2. This means that `index.html` can safely be processed using server-side
 * technologies such as
 * bindings. Bindings can thus use double-curly `{{ syntax }}` without collision from Angular 2
 * component double-curly
 * `{{ syntax }}`.
 *
 * We can use this script code:
 *
 * ```
 * @Component({
 *    selector: 'my-app'
 * })
 * @View({
 *    template: 'Hello {{ name }}!'
 * })
 * class MyApp {
 *   name:string;
 *
 *   constructor() {
 *     this.name = 'World';
 *   }
 * }
 *
 * main() {
 *   return bootstrap(MyApp);
 * }
 * ```
 *
 * When the app developer invokes `bootstrap()` with the root component `MyApp` as its argument,
 * Angular performs the
 * following tasks:
 *
 *  1. It uses the component's `selector` property to locate the DOM element which needs to be
 * upgraded into
 *     the angular component.
 *  2. It creates a new child injector (from the platform injector) and configures the injector with
 * the component's
 *     `appInjector`. Optionally, you can also override the injector configuration for an app by
 * invoking
 *     `bootstrap` with the `componentInjectableBindings` argument.
 *  3. It creates a new `Zone` and connects it to the angular application's change detection domain
 * instance.
 *  4. It creates a shadow DOM on the selected component's host element and loads the template into
 * it.
 *  5. It instantiates the specified component.
 *  6. Finally, Angular performs change detection to apply the initial data bindings for the
 * application.
 *
 *
 * ## Instantiating Multiple Applications on a Single Page
 *
 * There are two ways to do this.
 *
 *
 * ### Isolated Applications
 *
 * Angular creates a new application each time that the `bootstrap()` method is invoked. When
 * multiple applications
 * are created for a page, Angular treats each application as independent within an isolated change
 * detection and
 * `Zone` domain. If you need to share data between applications, use the strategy described in the
 * next
 * section, "Applications That Share Change Detection."
 *
 *
 * ### Applications That Share Change Detection
 *
 * If you need to bootstrap multiple applications that share common data, the applications must
 * share a common
 * change detection and zone. To do that, create a meta-component that lists the application
 * components in its template.
 * By only invoking the `bootstrap()` method once, with the meta-component as its argument, you
 * ensure that only a
 * single change detection zone is created and therefore data can be shared across the applications.
 *
 *
 * ## Platform Injector
 *
 * When working within a browser window, there are many singleton resources: cookies, title,
 * location, and others.
 * Angular services that represent these resources must likewise be shared across all Angular
 * applications that
 * occupy the same browser window.  For this reason, Angular creates exactly one global platform
 * injector which stores
 * all shared services, and each angular application injector has the platform injector as its
 * parent.
 *
 * Each application has its own private injector as well. When there are multiple applications on a
 * page, Angular treats
 * each application injector's services as private to that application.
 *
 *
 * # API
 * - `appComponentType`: The root component which should act as the application. This is a reference
 * to a `Type`
 *   which is annotated with `@Component(...)`.
 * - `componentInjectableBindings`: An additional set of bindings that can be added to `appInjector`
 * for the
 * {@link Component} to override default injection behavior.
 * - `errorReporter`: `function(exception:any, stackTrace:string)` a default error reporter for
 * unhandled exceptions.
 *
 * Returns a `Promise` with the application`s private {@link Injector}.
 *
 * @exportedAs angular2/core
 */
export function bootstrap(
  appComponentType: Type,
  componentInjectableBindings: List<Type | Binding | List<any>> = null,
  errorReporter: Function = null): Promise {

  BrowserDomAdapter.makeCurrent();
  var bootstrapProcess = PromiseWrapper.completer();

  var zone = _createNgZone(errorReporter);
  zone.run(() => {
    // TODO(rado): prepopulate template cache, so applications with only
    // index.html and main.js are possible.

    var appInjector = _createAppInjector(appComponentType, componentInjectableBindings, zone);
    var compRefToken: Promise =
        PromiseWrapper.wrap(() => appInjector.get(APP_COMPONENT_REF_PROMISE));
    PromiseWrapper.then(
        compRefToken,
        (defer) => {
          bootstrapProcess.resolve(defer(zone));
        },

        (err, stackTrace) => {bootstrapProcess.reject(err, stackTrace)});
  });

  return bootstrapProcess.promise;
}

export class ApplicationRef {
  _hostComponent: ComponentRef;
  _injector: Injector;
  _hostComponentType: Type;
  _lifeCycle: LifeCycle;
  constructor(
    hostComponent: ComponentRef,
    hostComponentType: Type,
    injector: Injector,
    lifeCycle: LifeCycle) {
    this._hostComponent = hostComponent;
    this._injector = injector;
    this._hostComponentType = hostComponentType;
    this._lifeCycle = lifeCycle;
  }

  get hostComponentType() { return this._hostComponentType; }

  get hostComponent() { return this._hostComponent.instance; }

  get hostLifecycle() { return this._lifeCycle; }

  dispose() {
    // TODO: We also need to clean up the Zone, ... here!
    return this._hostComponent.dispose();
  }

  get injector() { return this._injector; }
}

function _createAppInjector(appComponentType: Type, bindings: List<Type | Binding | List<any>>,
                            zone: NgZone): Injector {
  if (isBlank(_rootInjector)) {
    _rootInjector = Injector.resolveAndCreate(_rootBindings);
  }

  var mergedBindings: any =                 isPresent(bindings) ?
    ListWrapper.concat(_injectorBindings(appComponentType), bindings) :
                                   _injectorBindings(appComponentType);

  mergedBindings.push(bind(NgZone).toValue(zone));

  return _rootInjector.resolveAndCreateChild(mergedBindings);
}
