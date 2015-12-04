declare module "angular2/src/core/application_tokens" {
  var APP_COMPONENT_REF_PROMISE:any;
  var APP_COMPONENT:any;
  var APP_ID_RANDOM_PROVIDER: any;
}

declare module "angular2/src/core/render/render" {
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
