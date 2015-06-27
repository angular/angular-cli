// Type definitions for Angular v2.0.0-alpha.25
// Project: http://angular.io/
// Definitions by: gdi2290 <https://github.com/gdi2290/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/******************
 * This is a minimal type definition for the Angular2.
 * We plan to publish a complete definition soon.
 ******************/
///<reference path="../rx/rx.d.ts"/>


interface List<T> extends Array<T> {

}
interface Type {

}

interface _ComponentArg {
  selector: string;
  properties?: Object;
  hostListeners?: Object;
  appInjector?: List<any>;
  viewInjector?: List<any>;
  lifecycle?: List<any>;
  changeDetection?: string;
}

interface _ViewArg {
  templateUrl?: string;
  template?: string;
  directives?: List<Type>;
}

interface _DirectiveArg {
  selector: string;
  properties?: any;
  events?: List<string>;
  hostListeners?: any;
  hostProperties?: any;
  hostAttributes?: any;
  hostActions?: any;
  lifecycle?: List<any>;
  compileChildren?: boolean;
  hostInjector?: List<any>;
}


declare var zone: any;
declare var Zone: any;

declare module "angular2/angular2" {
}

declare module "angular2/http" {
  class Http {
    private _backend;
    private _defaultOptions;
    constructor(_backend: any, _defaultOptions: any);
    request(url: string, options?: any): any;
    get(url: string, options?: any): any;
    post(url: string, body: any, options?: any): any;
    put(url: string, body: any, options?: any): any;
    delete(url: string, options?: any): any;
    patch(url: string, body: any, options?: any): any;
    head(url: string, options?: any): any;
  }
  class HttpFactory {}
  class MockBackend {
    constructor(req: any)
  }
  class XHRBackend {}
  class BaseRequestOptions {}
  var httpInjectables: Array<any>;
}

declare module "angular2/src/render/dom/compiler/view_loader" {
  class ViewLoader {}
}

declare module "angular2/src/render/dom/compiler/style_url_resolver" {
  class StyleUrlResolver {}
}

declare module "angular2/src/render/dom/compiler/style_inliner" {
  class StyleInliner {}
}

declare module "angular2/src/core/compiler/view_resolver" {
  class ViewResolver {
    resolve(appComponent: any): any
  }
}

declare module "angular2/src/services/app_root_url" {
  class AppRootUrl {}
}

declare module "angular2/src/http/backends/browser_xhr" {
  class BrowserXHR {}
}

declare module "angular2/src/core/compiler/view_listener" {
  class AppViewListener {}
}

declare module "angular2/src/render/dom/compiler/template_loader" {
 class TemplateLoader {

 }
}

declare module "angular2/src/core/compiler/template_resolver" {
  class TemplateResolver {

  }
}

declare module "angular2/src/render/xhr_impl" {
  class XHRImpl {}
}

declare module "angular2/src/services/xhr_impl" {
  class XHRImpl {

  }
}

declare module "angular2/src/render/dom/events/key_events" {
  class KeyEventsPlugin {
    static getEventFullKey: any
    getEventFullKey: any
  }
}
declare module "angular2/src/render/dom/events/hammer_gestures" {
  class HammerGesturesPlugin {

  }
}
declare module "angular2/src/core/compiler/component_url_mapper" {
  class ComponentUrlMapper {

  }
}
declare module "angular2/src/services/url_resolver" {
  class UrlResolver {

  }

}
declare module "angular2/src/render/dom/shadow_dom/style_inliner" {
  class StyleInliner{}

}
declare module "angular2/src/core/compiler/dynamic_component_loader" {
  class ComponentRef {
    constructor(newLocation: any, component: any, dispose: any)
    location: any
    instance: any
    dispose: any
  }
  class DynamicComponentLoader {
    loadAsRoot(appComponentType: any, bindings: any, injector: any): any
  }
}
declare module "angular2/src/core/testability/testability" {
  class TestabilityRegistry {

  }
  class Testability {

  }
}
declare module "angular2/src/core/compiler/view_pool" {
  class AppViewPool {

  }
  var APP_VIEW_POOL_CAPACITY: any
}
declare module "angular2/src/core/compiler/view_manager" {
  class AppViewManager {

  }

}
declare module "angular2/src/core/compiler/view_manager_utils" {
  class AppViewManagerUtils {

  }
}
declare module "angular2/src/core/compiler/proto_view_factory" {
  class ProtoViewFactory {

  }
}
declare module "angular2/src/render/dom/compiler/compiler" {
  class DefaultDomCompiler {

  }
}
declare module "angular2/src/core/compiler/view_ref" {
  var internalView:any
}

declare module "angular2/src/reflection/reflection" {
 var reflector:any
 class Reflector {

 }
}
declare module "angular2/src/reflection/reflection_capabilities" {
  class ReflectionCapabilities {

  }
}

declare module "angular2/src/render/dom/view/proto_view" {
  class DomProtoView {
    rootBindingOffset: any;
    element: any;
    isTemplateElement(): any
    elementBinders(): any
  }

}

declare module "angular2/src/render/dom/view/view_container" {
  class DomViewContainer{}
}

declare module "angular2/src/render/dom/util" {
  var NG_BINDING_CLASS_SELECTOR: any;
  var NG_BINDING_CLASS: any ;
}


declare module "angular2/src/render/dom/dom_renderer" {
  class DomRenderer {
    _moveViewNodesIntoParent(): any
    _createGlobalEventListener(): any
    _createEventListener(): any
  }
  var DOCUMENT_TOKEN: any;
}

declare module "angular2/src/render/api" {
  class RenderCompiler {

  }
  class Renderer {

  }
  class RenderViewRef {

  }
  class RenderProtoViewRef {

  }

}
declare module "angular2/src/render/dom/shadow_dom/content_tag" {
  function Content(element: any, contentTagSelector:any): void;
}
declare module "angular2/src/render/dom/view/view" {
  class DomViewRef {

  }
  class DomView {
    viewContainers(): any
  }
  function resolveInternalDomView(viewRef: any): any;
}
declare module "angular2/src/render/dom/shadow_dom/shadow_dom_strategy" {
  class ShadowDomStrategy {
    prepareShadowRoot(element: any): any
    constructLightDom(lightDomView: any, el: any): any
  }
}

declare module "angular2/src/render/dom/events/event_manager" {
  class EventManager {
    constructor(...args)
    addEventListener(element: any, eventName: string, handler: Function): any
    addGlobalEventListener(target: string, eventName: string, handler: Function): any
  }
  class DomEventsPlugin {

  }
}

declare module "angular2/src/core/life_cycle/life_cycle" {
  class LifeCycle {
    constructor(...args)
    tick(): any;
  }
}

declare module "zone.js" {
  var zone: any;
  var Zone: any;
}

declare module "rtts_assert/rtts_assert" {
  var assert: any;
}

declare module "angular2/directives" {
  function NgSwitch(): void;
  function NgSwitchWhen(): void;
  function NgSwitchDefault(): void;
  function NgNonBindable(): void;
  function NgIf(): void;
  function NgFor(): void;

  var formDirectives: any;
  var coreDirectives: any;

}

declare module "angular2/change_detection" {
  class Parser {

  }
  class Lexer {

  }
  class ChangeDetection {

  }
  class DynamicChangeDetection {

  }
  class PipeRegistry {

  }
  class PreGeneratedChangeDetection {
    static isSupported(): boolean;
  }
  class JitChangeDetection {
    static isSupported(): boolean;
  }
  var defaultPipeRegistry: any;
}

declare module "angular2/src/core/zone/ng_zone" {
  class NgZone {
    constructor(config: any)
    initCallbacks(config: any): any
    run(context: any): any
  }
}

declare module "angular2/src/core/compiler/element_ref" {
  class ElementRef {
    constructor(host: any, location?: any)
    nativeElement: any;
  }
}

declare module "angular2/src/core/exception_handler" {
  class ExceptionHandler {

  }
}

declare module "angular2/src/render/xhr" {
  class XHR {

  }
}

declare module "angular2/src/core/application_tokens" {
  var appComponentRefToken: any;
  var appComponentTypeToken: any;
}

declare module "angular2/src/core/compiler/compiler" {
  class Compiler {

  }
  class CompilerCache {

  }
}

declare module "angular2/forms" {
  var formDirectives: any;
  class FormBuilder {
    group(): any
    array(): any
  }
  class Validators {
    static required(): any
  }
  class ControlGroup {
    value: any
    controls: any
    include(): any
    exclude(): any
  }
  class Control {
    valueChanges(): any
  }
  class ControlArray {
    push(): any
    removeAt(): any
  }
}

declare module "angular2/src/render/dom/shadow_dom/emulated_unscoped_shadow_dom_strategy" {
  class EmulatedUnscopedShadowDomStrategy {
    constructor(location: any)
  }
}

declare module "angular2/core" {
  class ElementRef {
    nativeElement: any;
  }
  class ViewResolver {
    resolve(appComponent: any): any
  }
  class DirectiveResolver {
    resolve(appComponent: any): any
  }
  class EmulatedScopedShadowDomStrategy {

  }
  class EmulatedUnscopedShadowDomStrategy {
    constructor(location: any)
  }
  class NativeShadowDomStrategy {

  }
  class ShadowDomStrategy {

  }
}

declare module "angular2/render" {
  class EmulatedScopedShadowDomStrategy {

  }
  class EmulatedUnscopedShadowDomStrategy {

  }
  class NativeShadowDomStrategy {

  }
  class ShadowDomStrategy {

  }
}

declare module "angular2/src/render/dom/shadow_dom/style_url_resolver" {
  class StyleUrlResolver {

  }
}

declare module "angular2/src/facade/async" {
  class ObservableWrapper {
    static callNext(next:any): any;
    static subscribe(observer:any): any;
  }
  class Promise {
    then(pro:any): any;
    all(all:any): any;
  }
  class PromiseWrapper {
    static wrap(func: any): any;
    static completer(): any;
    static all(all: any): any;
    static then(promise: any, success: any, error?: any): any;
  }
}

declare module "angular2/src/facade/collection" {
  var List: Array<any>;
  var Map: any;
  var ListWrapper: any;
  var MapWrapper: any;
  var StringMapWrapper: any;
}

declare module "angular2/src/facade/browser" {
  var __esModule: boolean;
  var win: any;
  var window: any;
  var document: any;
  var location: any;
  var gc: () => void;
  var Event: any;
  var MouseEvent: any;
  var KeyboardEvent: any;
}

declare module "angular2/src/facade/lang" {
  var int: any;
  var Type: Function;
  var assertionsEnabled: any;
  function isPresent(condition: any): boolean;
  function isBlank(condition: any): boolean;
  function isString(condition: any): boolean;
  class BaseException {

  }
  class RegExpWrapper {

  }
  class NumberWrapper {

  }
  class StringWrapper {
    static toLowerCase(str: string): string;
    static toUpperCase(str: string): string;
  }
  function print(str: any):any;
  function stringify(str: any):any;
}

declare module "angular2/src/core/compiler/directive_resolver" {
  class DirectiveResolver {
    resolve(appComponent: any): any
  }
}

declare module "angular2/router" {
  class Instruction {

  }
  class Router {
    navigate(url: string): any;
    config(config: any): any;
    deactivate(): any;
    activate(instruction: Instruction): any;
    recognize(url: string): Instruction;
    recognize(url: string): Instruction;
    renavigate(): any;
    generate(name:string, params:any): string;
    subscribe(onNext: Function): void;
  }
  var RouterOutlet: any;
  var RouterLink: any;
  var RouteParams: any;
  var routerInjectables: any;
  var RouteConfigAnnotation: any;
  var RouteConfig: any;
  var routerDirectives: any;
}


declare module "angular2/src/dom/browser_adapter" {
    class BrowserDomAdapter {
        static makeCurrent(): void;
        logError(error: any): void;
        attrToPropMap: any;
        query(selector: string): any;
        querySelector(el: any, selector: string): Node;
        querySelectorAll(el: any, selector: string): List<any>;
        on(el: any, evt: any, listener: any): void;
        onAndCancel(el: any, evt: any, listener: any): Function;
        dispatchEvent(el: any, evt: any): void;
        createMouseEvent(eventType: string): MouseEvent;
        createEvent(eventType: any): Event;
        getInnerHTML(el: any): any;
        getOuterHTML(el: any): any;
        nodeName(node: Node): string;
        nodeValue(node: Node): string;
        type(node: HTMLInputElement): string;
        content(node: Node): Node;
        firstChild(el: any): Node;
        nextSibling(el: any): Node;
        parentElement(el: any): any;
        childNodes(el: any): List<Node>;
        childNodesAsList(el: any): List<any>;
        clearNodes(el: any): void;
        appendChild(el: any, node: any): void;
        removeChild(el: any, node: any): void;
        replaceChild(el: Node, newChild: any, oldChild: any): void;
        remove(el: any): any;
        insertBefore(el: any, node: any): void;
        insertAllBefore(el: any, nodes: any): void;
        insertAfter(el: any, node: any): void;
        setInnerHTML(el: any, value: any): void;
        getText(el: any): any;
        setText(el: any, value: string): void;
        getValue(el: any): any;
        setValue(el: any, value: string): void;
        getChecked(el: any): any;
        setChecked(el: any, value: boolean): void;
        createTemplate(html: any): HTMLElement;
        createElement(tagName: any, doc?: Document): HTMLElement;
        createTextNode(text: string, doc?: Document): Text;
        createScriptTag(attrName: string, attrValue: string, doc?: Document): HTMLScriptElement;
        createStyleElement(css: string, doc?: Document): HTMLStyleElement;
        createShadowRoot(el: HTMLElement): DocumentFragment;
        getShadowRoot(el: HTMLElement): DocumentFragment;
        getHost(el: HTMLElement): HTMLElement;
        clone(node: Node): Node;
        hasProperty(element: any, name: string): boolean;
        getElementsByClassName(element: any, name: string): any;
        getElementsByTagName(element: any, name: string): any;
        classList(element: any): List<any>;
        addClass(element: any, classname: string): void;
        removeClass(element: any, classname: string): void;
        hasClass(element: any, classname: string): any;
        setStyle(element: any, stylename: string, stylevalue: string): void;
        removeStyle(element: any, stylename: string): void;
        getStyle(element: any, stylename: string): any;
        tagName(element: any): string;
        attributeMap(element: any): any;
        hasAttribute(element: any, attribute: string): any;
        getAttribute(element: any, attribute: string): any;
        setAttribute(element: any, name: string, value: string): void;
        removeAttribute(element: any, attribute: string): any;
        templateAwareRoot(el: any): any;
        createHtmlDocument(): Document;
        defaultDoc(): Document;
        getBoundingClientRect(el: any): any;
        getTitle(): string;
        setTitle(newTitle: string): void;
        elementMatches(n: any, selector: string): boolean;
        isTemplateElement(el: any): boolean;
        isTextNode(node: Node): boolean;
        isCommentNode(node: Node): boolean;
        isElementNode(node: Node): boolean;
        hasShadowRoot(node: any): boolean;
        isShadowRoot(node: any): boolean;
        importIntoDoc(node: Node): Node;
        isPageRule(rule: any): boolean;
        isStyleRule(rule: any): boolean;
        isMediaRule(rule: any): boolean;
        isKeyframesRule(rule: any): boolean;
        getHref(el: Element): string;
        getEventKey(event: any): string;
        getGlobalEventTarget(target: string): EventTarget;
        getHistory(): History;
        getLocation(): Location;
        getBaseHref(): any;
    }
}

declare module "angular2/src/dom/dom_adapter" {
    class DomAdapter {
        static makeCurrent(): void;
        logError(error: any): void;
        attrToPropMap: any;
        query(selector: string): any;
        querySelector(el: any, selector: string): Node;
        querySelectorAll(el: any, selector: string): List<any>;
        on(el: any, evt: any, listener: any): void;
        onAndCancel(el: any, evt: any, listener: any): Function;
        dispatchEvent(el: any, evt: any): void;
        createMouseEvent(eventType: string): MouseEvent;
        createEvent(eventType: any): Event;
        getInnerHTML(el: any): any;
        getOuterHTML(el: any): any;
        nodeName(node: Node): string;
        nodeValue(node: Node): string;
        type(node: HTMLInputElement): string;
        content(node: Node): Node;
        firstChild(el: any): Node;
        nextSibling(el: any): Node;
        parentElement(el: any): any;
        childNodes(el: any): List<Node>;
        childNodesAsList(el: any): List<any>;
        clearNodes(el: any): void;
        appendChild(el: any, node: any): void;
        removeChild(el: any, node: any): void;
        replaceChild(el: Node, newChild: any, oldChild: any): void;
        remove(el: any): any;
        insertBefore(el: any, node: any): void;
        insertAllBefore(el: any, nodes: any): void;
        insertAfter(el: any, node: any): void;
        setInnerHTML(el: any, value: any): void;
        getText(el: any): any;
        setText(el: any, value: string): void;
        getValue(el: any): any;
        setValue(el: any, value: string): void;
        getChecked(el: any): any;
        setChecked(el: any, value: boolean): void;
        createTemplate(html: any): HTMLElement;
        createElement(tagName: any, doc?: Document): HTMLElement;
        createTextNode(text: string, doc?: Document): Text;
        createScriptTag(attrName: string, attrValue: string, doc?: Document): HTMLScriptElement;
        createStyleElement(css: string, doc?: Document): HTMLStyleElement;
        createShadowRoot(el: HTMLElement): DocumentFragment;
        getShadowRoot(el: HTMLElement): DocumentFragment;
        getHost(el: HTMLElement): HTMLElement;
        clone(node: Node): Node;
        hasProperty(element: any, name: string): boolean;
        getElementsByClassName(element: any, name: string): any;
        getElementsByTagName(element: any, name: string): any;
        classList(element: any): List<any>;
        addClass(element: any, classname: string): void;
        removeClass(element: any, classname: string): void;
        hasClass(element: any, classname: string): any;
        setStyle(element: any, stylename: string, stylevalue: string): void;
        removeStyle(element: any, stylename: string): void;
        getStyle(element: any, stylename: string): any;
        tagName(element: any): string;
        attributeMap(element: any): any;
        hasAttribute(element: any, attribute: string): any;
        getAttribute(element: any, attribute: string): any;
        setAttribute(element: any, name: string, value: string): void;
        removeAttribute(element: any, attribute: string): any;
        templateAwareRoot(el: any): any;
        createHtmlDocument(): Document;
        defaultDoc(): Document;
        getBoundingClientRect(el: any): any;
        getTitle(): string;
        setTitle(newTitle: string): void;
        elementMatches(n: any, selector: string): boolean;
        isTemplateElement(el: any): boolean;
        isTextNode(node: Node): boolean;
        isCommentNode(node: Node): boolean;
        isElementNode(node: Node): boolean;
        hasShadowRoot(node: any): boolean;
        isShadowRoot(node: any): boolean;
        importIntoDoc(node: Node): Node;
        isPageRule(rule: any): boolean;
        isStyleRule(rule: any): boolean;
        isMediaRule(rule: any): boolean;
        isKeyframesRule(rule: any): boolean;
        getHref(el: Element): string;
        getEventKey(event: any): string;
        getGlobalEventTarget(target: string): EventTarget;
        getHistory(): History;
        getLocation(): Location;
        getBaseHref(): any;
    }
    var DOM: DomAdapter;
}
declare module "angular2/src/dom/parse5_adapter" {
    class Parse5DomAdapter {
        static makeCurrent(): void;
        logError(error: any): void;
        attrToPropMap: any;
        query(selector: string): any;
        querySelector(el: any, selector: string): Node;
        querySelectorAll(el: any, selector: string): List<any>;
        on(el: any, evt: any, listener: any): void;
        onAndCancel(el: any, evt: any, listener: any): Function;
        dispatchEvent(el: any, evt: any): void;
        createMouseEvent(eventType: string): MouseEvent;
        createEvent(eventType: any): Event;
        getInnerHTML(el: any): any;
        getOuterHTML(el: any): any;
        nodeName(node: Node): string;
        nodeValue(node: Node): string;
        type(node: HTMLInputElement): string;
        content(node: Node): Node;
        firstChild(el: any): Node;
        nextSibling(el: any): Node;
        parentElement(el: any): any;
        childNodes(el: any): List<Node>;
        childNodesAsList(el: any): List<any>;
        clearNodes(el: any): void;
        appendChild(el: any, node: any): void;
        removeChild(el: any, node: any): void;
        replaceChild(el: Node, newChild: any, oldChild: any): void;
        remove(el: any): any;
        insertBefore(el: any, node: any): void;
        insertAllBefore(el: any, nodes: any): void;
        insertAfter(el: any, node: any): void;
        setInnerHTML(el: any, value: any): void;
        getText(el: any): any;
        setText(el: any, value: string): void;
        getValue(el: any): any;
        setValue(el: any, value: string): void;
        getChecked(el: any): any;
        setChecked(el: any, value: boolean): void;
        createTemplate(html: any): HTMLElement;
        createElement(tagName: any, doc?: Document): HTMLElement;
        createTextNode(text: string, doc?: Document): Text;
        createScriptTag(attrName: string, attrValue: string, doc?: Document): HTMLScriptElement;
        createStyleElement(css: string, doc?: Document): HTMLStyleElement;
        createShadowRoot(el: HTMLElement): DocumentFragment;
        getShadowRoot(el: HTMLElement): DocumentFragment;
        getHost(el: HTMLElement): HTMLElement;
        clone(node: Node): Node;
        hasProperty(element: any, name: string): boolean;
        getElementsByClassName(element: any, name: string): any;
        getElementsByTagName(element: any, name: string): any;
        classList(element: any): List<any>;
        addClass(element: any, classname: string): void;
        removeClass(element: any, classname: string): void;
        hasClass(element: any, classname: string): any;
        setStyle(element: any, stylename: string, stylevalue: string): void;
        removeStyle(element: any, stylename: string): void;
        getStyle(element: any, stylename: string): any;
        tagName(element: any): string;
        attributeMap(element: any): any;
        hasAttribute(element: any, attribute: string): any;
        getAttribute(element: any, attribute: string): any;
        setAttribute(element: any, name: string, value: string): void;
        removeAttribute(element: any, attribute: string): any;
        templateAwareRoot(el: any): any;
        createHtmlDocument(): Document;
        defaultDoc(): Document;
        getBoundingClientRect(el: any): any;
        getTitle(): string;
        setTitle(newTitle: string): void;
        elementMatches(n: any, selector: string): boolean;
        isTemplateElement(el: any): boolean;
        isTextNode(node: Node): boolean;
        isCommentNode(node: Node): boolean;
        isElementNode(node: Node): boolean;
        hasShadowRoot(node: any): boolean;
        isShadowRoot(node: any): boolean;
        importIntoDoc(node: Node): Node;
        isPageRule(rule: any): boolean;
        isStyleRule(rule: any): boolean;
        isMediaRule(rule: any): boolean;
        isKeyframesRule(rule: any): boolean;
        getHref(el: Element): string;
        getEventKey(event: any): string;
        getGlobalEventTarget(target: string): EventTarget;
        getHistory(): History;
        getLocation(): Location;
        getBaseHref(): any;
    }
}



declare module "angular2/src/di/binding" {
  class Binding {

  }
}

declare module "angular2/di" {

  function bind(token: any): any;
  class Injector {
     resolveAndCreateChild(bindings: [any]): Injector;
     static resolveAndCreate(bindings: any): any;
     static fromResolvedBindings(bindings: any): any;
     get(di: any):any
  }
  var Injectable: any;
  class Dependency {

  }
  class Inject {

  }
  class InjectPromise {

  }
  class InjectLazy {

  }
  class Optional {

  }
  class Binding {

  }
  var ResolvedBinding: any;
  var Key: any;
  var KeyRegistry: any;
  var TypeLiteral: any;
  var NoBindingError: any;
  var AbstractBindingError: any;
  var AsyncBindingError: any;
  var CyclicDependencyError: any;
  var InstantiationError: any;
  var InvalidBindingError: any;
  var NoAnnotationError: any;
  var OpaqueToken: any;
  var ___esModule: any;
  var InjectAnnotation: any;
  var InjectPromiseAnnotation: any;
  var InjectLazyAnnotation: any;
  var OptionalAnnotation: any;
  var InjectableAnnotation: any;
  var DependencyAnnotation: any;
}
