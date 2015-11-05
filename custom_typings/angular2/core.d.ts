declare var zone: any;
// declare var Zone: any;
interface Type {}
interface Map<K,V> {}
interface StringMap<K,V> extends Map<K,V> {}


declare module "angular2/src/core/application_ref" {
  function platformProviders(): any;
  function createNgZone(): any;
  function applicationCommonProviders(): any;
}

declare module "angular2/src/core/forms" {
  var FORM_BINDINGS: any;
}

declare module "angular2/src/animate/browser_details" {
  class BrowserDetails {

  }
}

declare module 'angular2/src/animate/animation_builder' {
  class AnimationBuilder {

  }
}

declare module "angular2/src/core/application_tokens" {
  var APP_COMPONENT_REF_PROMISE:any;
  var APP_COMPONENT:any;
  var APP_ID_RANDOM_PROVIDER: any;
}
declare module "angular2/src/core/pipes" {
  var DEFAULT_PIPES:any;
}
declare module "angular2/src/core/platform_bindings" {
  var EXCEPTION_BINDING:any;
}

declare module "angular2/src/core/change_detection/pipes/pipe" {
  class PipeFactory {
  }
}
declare module "angular2/src/core/change_detection/change_detection" {
  var async:any;
  class Pipes {
    constructor(pipes:any);
  }
  var defaultPipes:any;
  class ChangeDetectionStrategy {

  }
  class Parser {

  }
  class Lexer {

  }
  class ChangeDetection {

  }
  class DynamicChangeDetection {

  }
  class Locals {

  }
  class BindingTarget {

  }
  class DirectiveIndex {

  }
  class ChangeDispatcher {

  }
  class ChangeDetector {

  }
  class AST {

  }
  class ChangeDetectorGenConfig {

  }
  class PreGeneratedChangeDetection {
    static isSupported():boolean;
  }
  class JitChangeDetection {
    static isSupported():boolean;
  }
  class IterableDiffers {
  }
  class KeyValueDiffers {
  }
  var defaultIterableDiffers:any;
  var defaultKeyValueDiffers:any;
}

declare module "angular2/src/core/compiler/compiler" {
  function compilerProviders(): Array<any>;
}

declare module "angular2/src/core/linker/compiler" {
  function compilerProviders(): Array<any>;
  class Compiler {

  }
  class Compiler_ {

  }
  class CompilerCache {

  }
}
declare module "angular2/src/core/linker/view_resolver" {
  class ViewResolver {
    resolve(appComponent:any):any;
  }
}
declare module "angular2/src/core/linker/directive_resolver" {
  class DirectiveResolver {
    resolve(appComponent:any):any;
  }
}
declare module "angular2/src/core/linker/component_url_mapper" {
  class ComponentUrlMapper {
  }
}
declare module "angular2/src/core/linker/dynamic_component_loader" {
  class ComponentRef {
    constructor(newLocation:any, component:any, dispose:any);

    location:any
    instance:any
    dispose:any
  }
  class DynamicComponentLoader {
    loadAsRoot(appComponentType:any, bindings:any, injector:any):any;
  }
  class DynamicComponentLoader_ {
    loadAsRoot(appComponentType:any, bindings:any, injector:any):any;
  }
}
declare module "angular2/src/core/linker/view_pool" {
  class AppViewPool {

  }
  var APP_VIEW_POOL_CAPACITY:any
}
declare module "angular2/src/core/linker/view_manager" {
  class AppViewManager {

  }
  class AppViewManager_ {

  }

}
declare module "angular2/src/core/linker/view_manager_utils" {
  class AppViewManagerUtils {

  }
}
declare module "angular2/src/core/linker/proto_view_factory" {
  class ProtoViewFactory {

  }
}
declare module "angular2/src/core/linker/view_listener" {
  class AppViewListener {
  }
}
declare module "angular2/src/core/linker/view_ref" {
  var internalView:any
  class ProtoViewRef {

  }
}
declare module "angular2/src/core/linker/element_ref" {
  class ElementRef {
    constructor(host:any, location?:any);

    nativeElement:any;
  }
}
declare module "angular2/src/core/linker/pipe_resolver" {
  class PipeResolver {
    resolve(pipes:any):any;
  }
}

declare module "angular2/src/core/dom/browser_adapter" {
  class BrowserDomAdapter {
    static makeCurrent():void;

    logError(error:any):void;

    attrToPropMap:any;

    query(selector:string):any;

    querySelector(el:any, selector:string):Node;

    querySelectorAll(el:any, selector:string):any[];

    on(el:any, evt:any, listener:any):void;

    onAndCancel(el:any, evt:any, listener:any):Function;

    dispatchEvent(el:any, evt:any):void;

    createMouseEvent(eventType:string):MouseEvent;

    createEvent(eventType:any):Event;

    getInnerHTML(el:any):any;

    getOuterHTML(el:any):any;

    nodeName(node:Node):string;

    nodeValue(node:Node):string;

    type(node:HTMLInputElement):string;

    content(node:Node):Node;

    firstChild(el:any):Node;

    nextSibling(el:any):Node;

    parentElement(el:any):any;

    childNodes(el:any):Node[];

    childNodesAsList(el:any):any[];

    clearNodes(el:any):void;

    appendChild(el:any, node:any):void;

    removeChild(el:any, node:any):void;

    replaceChild(el:Node, newChild:any, oldChild:any):void;

    remove(el:any):any;

    insertBefore(el:any, node:any):void;

    insertAllBefore(el:any, nodes:any):void;

    insertAfter(el:any, node:any):void;

    setInnerHTML(el:any, value:any):void;

    getText(el:any):any;

    setText(el:any, value:string):void;

    getValue(el:any):any;

    setValue(el:any, value:string):void;

    getChecked(el:any):any;

    setChecked(el:any, value:boolean):void;

    createTemplate(html:any):HTMLElement;

    createElement(tagName:any, doc?:Document):HTMLElement;

    createTextNode(text:string, doc?:Document):Text;

    createScriptTag(attrName:string, attrValue:string, doc?:Document):HTMLScriptElement;

    createStyleElement(css:string, doc?:Document):HTMLStyleElement;

    createShadowRoot(el:HTMLElement):DocumentFragment;

    getShadowRoot(el:HTMLElement):DocumentFragment;

    getHost(el:HTMLElement):HTMLElement;

    clone(node:Node):Node;

    hasProperty(element:any, name:string):boolean;

    getElementsByClassName(element:any, name:string):any;

    getElementsByTagName(element:any, name:string):any;

    classList(element:any):any[];

    addClass(element:any, classname:string):void;

    removeClass(element:any, classname:string):void;

    hasClass(element:any, classname:string):any;

    setStyle(element:any, stylename:string, stylevalue:string):void;

    removeStyle(element:any, stylename:string):void;

    getStyle(element:any, stylename:string):any;

    tagName(element:any):string;

    attributeMap(element:any):any;

    hasAttribute(element:any, attribute:string):any;

    getAttribute(element:any, attribute:string):any;

    setAttribute(element:any, name:string, value:string):void;

    removeAttribute(element:any, attribute:string):any;

    templateAwareRoot(el:any):any;

    createHtmlDocument():Document;

    defaultDoc():Document;

    getBoundingClientRect(el:any):any;

    getTitle():string;

    setTitle(newTitle:string):void;

    elementMatches(n:any, selector:string):boolean;

    isTemplateElement(el:any):boolean;

    isTextNode(node:Node):boolean;

    isCommentNode(node:Node):boolean;

    isElementNode(node:Node):boolean;

    hasShadowRoot(node:any):boolean;

    isShadowRoot(node:any):boolean;

    importIntoDoc(node:Node):Node;

    isPageRule(rule:any):boolean;

    isStyleRule(rule:any):boolean;

    isMediaRule(rule:any):boolean;

    isKeyframesRule(rule:any):boolean;

    getHref(el:Element):string;

    getEventKey(event:any):string;

    getGlobalEventTarget(target:string):EventTarget;

    getHistory():History;

    getLocation():Location;

    getBaseHref():any;
  }
}
declare module "angular2/src/core/dom/dom_adapter" {
  class DomAdapter {
    static makeCurrent():void;

    logError(error:any):void;

    attrToPropMap:any;

    invoke(element: any, method: any, args: any):any

    query(selector:string):any;

    querySelector(el:any, selector:string):Node;

    querySelectorAll(el:any, selector:string):any[];

    on(el:any, evt:any, listener:any):void;

    onAndCancel(el:any, evt:any, listener:any):Function;

    dispatchEvent(el:any, evt:any):void;

    createMouseEvent(eventType:string):MouseEvent;

    createEvent(eventType:any):Event;

    getInnerHTML(el:any):any;

    getOuterHTML(el:any):any;

    nodeName(node:Node):string;

    nodeValue(node:Node):string;

    type(node:HTMLInputElement):string;

    content(node:Node):Node;

    firstChild(el:any):Node;

    nextSibling(el:any):Node;

    parentElement(el:any):any;

    childNodes(el:any):Node[];

    childNodesAsList(el:any):any[];

    clearNodes(el:any):void;

    appendChild(el:any, node:any):void;

    removeChild(el:any, node:any):void;

    replaceChild(el:Node, newChild:any, oldChild:any):void;

    remove(el:any):any;

    insertBefore(el:any, node:any):void;

    insertAllBefore(el:any, nodes:any):void;

    insertAfter(el:any, node:any):void;

    setInnerHTML(el:any, value:any):void;

    getText(el:any):any;

    setText(el:any, value:string):void;

    getValue(el:any):any;

    setValue(el:any, value:string):void;

    getChecked(el:any):any;

    setChecked(el:any, value:boolean):void;

    createTemplate(html:any):HTMLElement;

    createElement(tagName:any, doc?:Document):HTMLElement;

    createTextNode(text:string, doc?:Document):Text;

    createScriptTag(attrName:string, attrValue:string, doc?:Document):HTMLScriptElement;

    createStyleElement(css:string, doc?:Document):HTMLStyleElement;

    createShadowRoot(el:HTMLElement):DocumentFragment;

    getShadowRoot(el:HTMLElement):DocumentFragment;

    getHost(el:HTMLElement):HTMLElement;

    clone(node:Node):Node;

    hasProperty(element:any, name:string):boolean;

    getElementsByClassName(element:any, name:string):any;

    getElementsByTagName(element:any, name:string):any;

    classList(element:any):any[];

    addClass(element:any, classname:string):void;

    removeClass(element:any, classname:string):void;

    hasClass(element:any, classname:string):any;

    setStyle(element:any, stylename:string, stylevalue:string):void;

    removeStyle(element:any, stylename:string):void;

    getStyle(element:any, stylename:string):any;

    tagName(element:any):string;

    attributeMap(element:any):any;

    hasAttribute(element:any, attribute:string):any;

    getAttribute(element:any, attribute:string):any;

    setAttribute(element:any, name:string, value:string):void;

    removeAttribute(element:any, attribute:string):any;

    templateAwareRoot(el:any):any;

    createHtmlDocument():Document;

    defaultDoc():Document;

    getBoundingClientRect(el:any):any;

    getTitle():string;

    setTitle(newTitle:string):void;

    elementMatches(n:any, selector:string):boolean;

    isTemplateElement(el:any):boolean;

    isTextNode(node:Node):boolean;

    isCommentNode(node:Node):boolean;

    isElementNode(node:Node):boolean;

    hasShadowRoot(node:any):boolean;

    isShadowRoot(node:any):boolean;

    importIntoDoc(node:Node):Node;

    isPageRule(rule:any):boolean;

    isStyleRule(rule:any):boolean;

    isMediaRule(rule:any):boolean;

    isKeyframesRule(rule:any):boolean;

    getHref(el:Element):string;

    getEventKey(event:any):string;

    getGlobalEventTarget(target:string):EventTarget;

    getHistory():History;

    getLocation():Location;

    getBaseHref():any;
  }
  var DOM:DomAdapter;
}
declare module "angular2/src/core/dom/parse5_adapter" {
  class Parse5DomAdapter {
    static makeCurrent(): void;
    logError(error: any): void;
    attrToPropMap: any;
    query(selector: string): any;
    querySelector(el: any, selector: string): Node;
    querySelectorAll(el: any, selector: string): any[];
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
    childNodes(el: any): Node[];
    childNodesAsList(el: any): any[];
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
    classList(element: any): any[];
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

declare module "angular2/src/core/facade/async" {
  class ObservableWrapper {
    static callNext(next:any, obs?:any):any;

    static subscribe(observer: any, success?: any, fail?: any, complete?: any):any;

    static callReturn(obs:any):any;

    static callThrow(obs:any, res?:any):any;
  }
  class Observable {
  }
  class Promise<T> {
    static reject(pro:any):any;
    static resolve(pro:any):any;
    constructor(fn: Function)
    then(pro:any):any;

    all(all:any):any;
  }
  class PromiseCompleter {
  }
  class PromiseWrapper {
    static resolve(pro:any, failure:any):any;

    static reject(pro:any, failure:any):any;

    static completer():any;

    static all(all:any):any;

    static then(pro:any, sucess?:any, failure?:any):any;

    static catchError(pro:any, failure:any):any;

    static wrap(pro:any):any;
  }
  class EventEmitter {
    toRx():any;
  }
}
declare module "angular2/src/core/facade/lang" {
  var int:any;
  var Type:Function;
  var isDart:boolean;

  class ConcreteType {

  }

  function CONST_EXPR(exp:any):any;

  var assertionsEnabled:any;

  function isPresent(bool:any):boolean;

  function isBlank(bool:any):boolean;

  function isString(bool:any):boolean;

  class BaseException {

  }
  class RegExpWrapper {

  }
  class NumberWrapper {

  }
  class StringWrapper {
    static toLowerCase(str:string):string;

    static toUpperCase(str:string):string;
  }
  function print(str:any):any;

  function stringify(str:any):any;
}
declare module "angular2/src/core/facade/collection" {
  class StringMap {
    constructor(obj: any)
  }
  interface Predicate<T> { (value: T, index?: number, array?: T[]): boolean; }
  var List:Array<any>;
  var Map:any;
  var ListWrapper:any;
  var MapWrapper:any;
  var StringMapWrapper:any;
}
declare module "angular2/src/core/facade/exceptions" {
  class BaseException {

  }
  class WrappedException {

  }
  class ExceptionHandler {
    constructor(DOM:any, isDart:boolean);

    call(exception:any, stackTrace:any):any;
  }
}

declare module "angular2/src/core/life_cycle/life_cycle" {
  class LifeCycle {
    constructor(...args);

    tick():any;
  }
  class LifeCycle_ {
    constructor(...args);

    tick():any;
  }
}

declare module "angular2/src/mock/mock_location_strategy" {

  import {LocationStrategy} from 'angular2/src/core/router/location_strategy';
  import {EventEmitter, ObservableWrapper} from 'angular2/src/core/facade/async';

  class MockLocationStrategy extends LocationStrategy {
    internalBaseHref:string;
    internalPath:string;
    internalTitle:string;
    urlChanges:string[];
    _subject:EventEmitter;

    simulatePopState(url:string):void;

    path():string;

    simulateUrlPop(pathname:string):void;

    pushState(ctx:any, title:string, url:string):void;

    onPopState(fn:(value:any) => void):void;

    getBaseHref():string;

    back():void;
  }
}

declare module "angular2/src/core/profile/wtf_init" {
  function wtfInit():any;
}

declare module "angular2/src/core/reflection/reflection" {
  var reflector:any
  class Reflector {

  }
}

declare module "angular2/src/core/render/api" {
  class RenderCompiler {

  }
  class Renderer {

  }
  class RenderElementRef {

  }
  class RenderViewRef {

  }
  class RenderProtoViewRef {

  }
  class RenderFragmentRef {

  }
  class RenderViewWithFragments {

  }
  class RenderEventDispatcher {

  }
}
declare module "angular2/src/core/render/dom/shadow_dom/shadow_dom_strategy" {
  class ShadowDomStrategy {
    prepareShadowRoot(element:any):any;

    constructLightDom(lightDomView:any, el:any):any;
  }
}
declare module "angular2/src/core/render/dom/shadow_dom/emulated_unscoped_shadow_dom_strategy" {
  class EmulatedUnscopedShadowDomStrategy {
    styleHost:any;

    constructor(styleHost:any);

    hasNativeContentElement():boolean;

    prepareShadowRoot(el:any):any;

    constructLightDom(lightDomView:any, el:any):any;

    processStyleElement(hostComponentId:string, templateUrl:string, styleEl:any):void;

  }
}
declare module "angular2/src/core/render/dom/dom_renderer" {
  class DomRenderer {
    _moveViewNodesIntoParent():any;

    _createGlobalEventListener():any;

    _createEventListener():any;
  }
  class DefaultDomCompiler {
  }
  var DOCUMENT:any;
}
declare module "angular2/src/core/render/dom/compiler/view_loader" {
  class ViewLoader {
  }
}
declare module "angular2/src/core/render/dom/compiler/style_url_resolver" {
  class StyleUrlResolver {
  }
}
declare module "angular2/src/core/render/dom/compiler/style_inliner" {
  class StyleInliner {
  }
}
declare module "angular2/src/core/render/dom/compiler/template_loader" {
  class TemplateLoader {

  }
}
declare module "angular2/src/core/compiler/xhr_impl" {
  class XHRImpl {
  }
}
declare module "angular2/src/core/render/dom/events/key_events" {
  class KeyEventsPlugin {
    static getEventFullKey:any
    getEventFullKey:any
  }
}
declare module "angular2/src/core/render/dom/events/hammer_gestures" {
  class HammerGesturesPlugin {

  }
}
declare module "angular2/src/core/render/dom/shadow_dom/style_inliner" {
  class StyleInliner {
  }

}
declare module "angular2/src/core/render/dom/compiler/compiler" {
  class DefaultDomCompiler {

  }
}
declare module "angular2/src/core/render/dom/template_cloner" {
  class TemplateCloner {
  }
}
declare module "angular2/src/core/render/dom/view/view" {
  class DomViewRef {

  }
  class DomView {
    viewContainers(): any;
  }
  function resolveInternalDomView(viewRef: any): any;
}
declare module "angular2/src/core/compiler/xhr" {
  class XHR {
  }
}
declare module "angular2/src/core/render/dom/events/event_manager" {
  var EVENT_MANAGER_PLUGINS: any;
  class EventManager {
    constructor(...args);

    addEventListener(element:any, eventName:string, handler:Function):any;

    addGlobalEventListener(target:string, eventName:string, handler:Function):any;
  }
  class DomEventsPlugin {

  }
}
declare module "angular2/src/core/render/render" {
  class TemplateCloner {
  }
  var DOCUMENT:any;
  var DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES:any;
  var APP_ID_RANDOM_BINDING:any;
  var MAX_IN_MEMORY_ELEMENTS_PER_TEMPLATE:any;
  var DOCUMENT:any;
  var DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES:any;
  class RenderElementRef {
    renderView:any;
    boundElementIndex:any;
  }
  class RenderEmbeddedTemplateCmd {

  }
  class RenderBeginComponentCmd {

  }
  class RenderNgContentCmd {

  }
  class RenderTextCmd {

  }
  class RenderBeginElementCmd {

  }
  class RenderCommandVisitor {

  }
  class RenderTemplateCmd {

  }
  class DomRenderer {
    constructor(_eventManager:any, _domSharedStylesHost:any, _templateCloner:any, document:any);

    setElementProperty(location:any, propertyName:any, propertyValue:any):any;

    invokeElementMethod(location:any, methodName:any, args:any):any;

  }
  class DomRenderer_ {
    constructor(_eventManager:any, _domSharedStylesHost:any, _templateCloner:any, document:any);

    setElementProperty(location:any, propertyName:any, propertyValue:any):any;

    invokeElementMethod(location:any, methodName:any, args:any):any;

  }
  class ShadowDomStrategy {
    hasNativeContentElement():boolean;

    prepareShadowRoot(el:any):any;

    constructLightDom(lightDomView:any, el:any):any;

    processStyleElement(hostComponentId:string, templateUrl:string, styleElement:any):void;

    processElement(hostComponentId:string, elementComponentId:string, element:any):void;
  }
  class NativeShadowDomStrategy extends ShadowDomStrategy {
    prepareShadowRoot(el:any):any;
  }
  class EmulatedUnscopedShadowDomStrategy extends ShadowDomStrategy {
    styleHost:any;

    constructor(styleHost:any);

    hasNativeContentElement():boolean;

    prepareShadowRoot(el:any):any;

    constructLightDom(lightDomView:any, el:any):any;

    processStyleElement(hostComponentId:string, templateUrl:string, styleEl:any):void;

  }
  class EmulatedScopedShadowDomStrategy extends EmulatedUnscopedShadowDomStrategy {
    constructor(styleHost:any);

    processStyleElement(hostComponentId:string, templateUrl:string, styleEl:any):void;

    _moveToStyleHost(styleEl:any):void;

    processElement(hostComponentId:string, elementComponentId:string, element:any):void;

  }
  class Renderer {
    /**
     * Creates a root host view that includes the given element.
     * @param {RenderProtoViewRef} hostProtoViewRef a RenderProtoViewRef of type
     * ProtoViewDto.HOST_VIEW_TYPE
     * @param {any} hostElementSelector css selector for the host element (will be queried against the
     * main document)
     * @return {RenderViewRef} the created view
     */
    createRootHostView(hostProtoViewRef:any, hostElementSelector:string):any;

    /**
     * Creates a regular view out of the given ProtoView
     */
    createView(protoViewRef:any):any;

    /**
     * Destroys the given view after it has been dehydrated and detached
     */
    destroyView(viewRef:any):void;

    /**
     * Attaches a componentView into the given hostView at the given element
     */
    attachComponentView(location:any, componentViewRef:any):void;

    /**
     * Detaches a componentView into the given hostView at the given element
     */
    detachComponentView(location:any, componentViewRef:any):void;

    /**
     * Attaches a view into a ViewContainer (in the given parentView at the given element) at the
     * given index.
     */
    attachViewInContainer(location:any, atIndex:number, viewRef:any):void;

    /**
     * Detaches a view into a ViewContainer (in the given parentView at the given element) at the
     * given index.
     */
    detachViewInContainer(location:any, atIndex:number, viewRef:any):void;

    /**
     * Hydrates a view after it has been attached. Hydration/dehydration is used for reusing views
     * inside of the view pool.
     */
    hydrateView(viewRef:any):void;

    /**
     * Dehydrates a view after it has been attached. Hydration/dehydration is used for reusing views
     * inside of the view pool.
     */
    dehydrateView(viewRef:any):void;

    /**
     * Returns the native element at the given location.
     * Attention: In a WebWorker scenario, this should always return null!
     */
    getNativeElementSync(location:any):any;

    /**
     * Sets a property on an element.
     */
    setElementProperty(location:any, propertyName:string, propertyValue:any):void;

    /**
     * Sets an attribute on an element.
     */
    setElementAttribute(location:any, attributeName:string, attributeValue:string):void;

    /**
     * Sets a class on an element.
     */
    setElementClass(location:any, className:string, isAdd:boolean):void;

    /**
     * Sets a style on an element.
     */
    setElementStyle(location:any, styleName:string, styleValue:string):void;

    /**
     * Calls a method on an element.
     */
    invokeElementMethod(location:any, methodName:string, args:any[]):void;

    /**
     * Sets the value of a text node.
     */
    setText(viewRef:any, textNodeIndex:number, text:string):void;

    /**
     * Sets the dispatcher for all events of the given view
     */
    setEventDispatcher(viewRef:any, dispatcher:any):void;
  }
}
declare module "angular2/src/core/render/dom/schema/element_schema_registry" {
  class ElementSchemaRegistry {
  }
}
declare module "angular2/src/core/render/dom/schema/dom_element_schema_registry" {
  class DomElementSchemaRegistry {
  }
}
declare module "angular2/src/core/render/dom/shared_styles_host" {
  class SharedStylesHost {
  }
  class DomSharedStylesHost {
  }
}

declare module "angular2/src/core/router/location_strategy" {
  class LocationStrategy {
    path():string;

    pushState(ctx:any, title:string, url:string):void;

    forward():void;

    back():void;

    onPopState(fn:(_:any) => any):void;

    getBaseHref():string;
  }
}

declare module "angular2/src/core/services/url_resolver" {
  class UrlResolver {
  }
}
declare module "angular2/src/core/services/app_root_url" {
  class AppRootUrl {
  }
}
declare module "angular2/src/core/services/anchor_based_app_root_url" {
  class AnchorBasedAppRootUrl {
  }
}

declare module "angular2/src/core/testability/testability" {
  class TestabilityRegistry {

  }
  class Testability {

  }
}

declare module "angular2/src/core/zone/ng_zone" {
  class NgZone {
    constructor(config:any);

    initCallbacks(config:any):any;

    overrideOnErrorHandler(reporter:any):any;

    run(context:any):any;
  }
}
