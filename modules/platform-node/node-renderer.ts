// PRIVATE
import { getDOM } from './get-dom';
// PRIVATE

import {
  Inject,
  Injectable,
  Renderer,
  RenderComponentType,
  RootRenderer,
  ViewEncapsulation,
} from '@angular/core';

import {
  DOCUMENT,
  AnimationDriver,
  EventManager,
} from '@angular/platform-browser';


import {
  cssHyphenate,
  isPresent,
  isBlank,
  stringify,
  listContains,
  camelCaseToDashCase,
} from './helper';

import {
  NodeSharedStylesHost
} from './node-shared-styles-host';

const NAMESPACE_URIS = {
  'xlink': 'http://www.w3.org/1999/xlink',
  'svg': 'http://www.w3.org/2000/svg',
  'xhtml': 'http://www.w3.org/1999/xhtml'
};
const TEMPLATE_COMMENT_TEXT = 'template bindings={}';
const TEMPLATE_BINDINGS_EXP = /^template bindings=(.*)$/;

@Injectable()
export class NodeDomRootRenderer implements RootRenderer {
  protected registeredComponents: Map<string, DomRenderer> = new Map<string, DomRenderer>();
  constructor(
    @Inject(DOCUMENT) public document: any,
    public eventManager: EventManager,
    public sharedStylesHost: NodeSharedStylesHost,
    private _animationDriver: AnimationDriver) {
  }
  renderComponent(componentProto: RenderComponentType): Renderer {
    // TODO(gdi2290): see PR https://github.com/angular/angular/pull/6584
    var renderer = this.registeredComponents.get(componentProto.id);
    if (isBlank(renderer)) {
      renderer = new NodeDomRenderer(this, componentProto, this._animationDriver);
      this.registeredComponents.set(componentProto.id, renderer);
    }
    return renderer;
  }

}

export const ATTRIBUTES = {
  textarea: [
    'autocapitalize',
    'autocomplete',
    'autofocus',
    'cols',
    'disabled',
    'form',
    'maxlength',
    'minlength',
    'name',
    'placeholder',
    'readonly',
    'required',
    'rows',
    'selectionDirection',
    'selectionEnd',
    'selectionStart',
    'spellcheck',
    'wrap'
  ],
  script: [
    'async',
    'integrity',
    'src',
    'type',
    'text',
    'defer',
    'crossorigin'
  ],
  button: [
    'autofocus',
    'autocomplete',
    'disabled',
    'form',
    'formaction',
    'formenctype',
    'formmethod',
    'formnovalidate',
    'formtarget',
    'name',
    'type',
    'value'
  ],
  fieldset: [
    'disabled',
    'form',
    'name'
  ],
  a: [
    'download',
    'href',
    'hreflang',
    'ping',
    'referrerpolicy',
    'rel',
    'target',
    'type'
  ],
  img: [
    'alt',
    'crossorigin',
    'height',
    'ismap',
    'longdesc',
    'referrerpolicy',
    'sizesHTML5',
    'src',
    'srcsetHTML5',
    'width',
    'usemap'
  ],
  input: [
    'id',

    'type',
    'accept',
    'mozactionhint',
    'autocapitalize',
    'autocomplete',
    'autocorrect',
    'autofocus',
    'autosave',
    'checked',
    'disabled',
    'form',
    'formaction',
    'formenctype',
    'formmethod',
    'formnovalidate',
    'formtarget',
    'height',
    'incremental',
    'inputmode',
    'list',
    'max',
    'maxlength',
    'min',
    'minlength',
    'multiple',
    'name',
    'pattern',
    'placeholder',
    'readonly',
    'required',
    'results',
    'selectionDirection',
    'size',
    'spellcheck',
    'src',
    'step',
    'tabindex',
    'value',
    'width',
    'x-moz-errormessage'
  ],
  output: [
    'for',
    'form',
    'name'
  ],
  progress: [
    'max',
    'value'
  ],
  label: [
    'accesskey',
    'for',
    'form'
  ],
  option: [
    'disabled',
    'label',
    'selected',
    'value'
  ],
  select: [
    'autofocus',
    'disabled',
    'multiple',
    'form',
    'multiple',
    'name',
    'required',
    'size'
  ],
  optgroup: [
    'disabled',
    'label'
  ],
  form: [
    'accept-charset',
    'action',
    'autocapitalize',
    'autocomplete',
    'enctype',
    'method',
    'name',
    'novalidate',
    'target'
  ]
};

// TODO(gdi2290): provide better whitelist above to alias setting props as attrs
export const IGNORE_ATTRIBUTES = {
  'innerHTML': true,
  'hidden' : true
};

// TODO(gdi2290): combine both renderers
export class DomRenderer implements Renderer {
  private _contentAttr: string;
  private _hostAttr: string;
  private _styles: string[];

  constructor(
      private _rootRenderer: NodeDomRootRenderer, private componentProto: RenderComponentType,
      private _animationDriver: AnimationDriver) {
    this._styles = _flattenStyles(componentProto.id, componentProto.styles, []);
    if (componentProto.encapsulation !== ViewEncapsulation.Native) {
      this._rootRenderer.sharedStylesHost.addStyles(this._styles);
    }
    if (this.componentProto.encapsulation === ViewEncapsulation.Emulated) {
      this._contentAttr = _shimContentAttribute(componentProto.id);
      this._hostAttr = _shimHostAttribute(componentProto.id);
    } else {
      this._contentAttr = null;
      this._hostAttr = null;
    }
  }

  selectRootElement(_selectorOrNode: string|any, _debugInfo: any /*RenderDebugInfo*/): any { /*Element*/
  //   var el: any;
  //   if (isString(selectorOrNode)) {
  //     el = getDOM().querySelector(this._rootRenderer.document, selectorOrNode);
  //     if (isBlank(el)) {
  //       throw new Error(`The selector "${selectorOrNode}" did not match any elements`);
  //     }
  //   } else {
  //     el = selectorOrNode;
  //   }
  //   getDOM().clearNodes(el);
  //   return el;
  }

  createElement(parent: any/*Element*/, name: string, _debugInfo: any/*RenderDebugInfo*/): any { /* Node */
    var nsAndName = splitNamespace(name);
    var el = isPresent(nsAndName[0]) ?
        getDOM().createElementNS(
            (NAMESPACE_URIS as any)[nsAndName[0]], nsAndName[1]) :
        getDOM().createElement(nsAndName[1]);
    if (isPresent(this._contentAttr)) {
      getDOM().setAttribute(el, this._contentAttr, '');
    }
    if (isPresent(parent)) {
      getDOM().appendChild(parent, el);
    }
    return el;
  }

  createViewRoot(hostElement: any): any {
    var nodesParent: any;
    if (this.componentProto.encapsulation === ViewEncapsulation.Native) {
      nodesParent = getDOM().createShadowRoot(hostElement);
      this._rootRenderer.sharedStylesHost.addHost(nodesParent);
      for (let i = 0; i < this._styles.length; i++) {
        getDOM().appendChild(nodesParent, getDOM().createStyleElement(this._styles[i]));
      }
    } else {
      if (isPresent(this._hostAttr)) {
        getDOM().setAttribute(hostElement, this._hostAttr, '');
      }
      nodesParent = hostElement;
    }
    return nodesParent;
  }

  createTemplateAnchor(parentElement: any, _debugInfo: any /*RenderDebugInfo*/): any {
    var comment = getDOM().createComment(TEMPLATE_COMMENT_TEXT);
    if (isPresent(parentElement)) {
      getDOM().appendChild(parentElement, comment);
    }
    return comment;
  }

  createText(parentElement: any, value: string, _debugInfo: any /*RenderDebugInfo*/): any {
    var node = getDOM().createTextNode(value);
    if (isPresent(parentElement)) {
      getDOM().appendChild(parentElement, node);
    }
    return node;
  }

  projectNodes(parentElement: any, nodes: any[]) {
    if (isBlank(parentElement)) { return; }
    appendNodes(parentElement, nodes);
  }

  attachViewAfter(node: any, viewRootNodes: any[]) {
    moveNodesAfterSibling(node, viewRootNodes);
  }

  detachView(viewRootNodes: any[]) {
    for (var i = 0; i < viewRootNodes.length; i++) {
      getDOM().remove(viewRootNodes[i]);
    }
  }

  destroyView(hostElement: any, _viewAllNodes: any[]) {
    if (this.componentProto.encapsulation === ViewEncapsulation.Native && isPresent(hostElement)) {
      this._rootRenderer.sharedStylesHost.removeHost(getDOM().getShadowRoot(hostElement));
    }
  }

  listen(renderElement: any, name: string, callback: Function): Function {
    return this._rootRenderer.eventManager.addEventListener(
        renderElement, name, decoratePreventDefault(callback));
  }

  listenGlobal(target: string, name: string, callback: Function): Function {
    return this._rootRenderer.eventManager.addGlobalEventListener(target, name, decoratePreventDefault(callback));
  }

  setElementProperty(renderElement: any, propertyName: string, propertyValue: any): void {
    getDOM().setProperty(renderElement, propertyName, propertyValue);
  }

  setElementAttribute(renderElement: any, attributeName: string, attributeValue: string): void {
    var attrNs: any;
    var nsAndName = splitNamespace(attributeName);
    if (isPresent(nsAndName[0])) {
      attributeName = nsAndName[0] + ':' + nsAndName[1];
      attrNs = (NAMESPACE_URIS as any)[nsAndName[0]];
    }
    if (isPresent(attributeValue)) {
      if (isPresent(attrNs)) {
        getDOM().setAttributeNS(renderElement, attrNs, attributeName, attributeValue);
      } else {
        getDOM().setAttribute(renderElement, attributeName, attributeValue);
      }
    } else {
      if (isPresent(attrNs)) {
        getDOM().removeAttributeNS(renderElement, attrNs, nsAndName[1]);
      } else {
        getDOM().removeAttribute(renderElement, attributeName);
      }
    }
  }

  setBindingDebugInfo(renderElement: any, propertyName: string, propertyValue: string): void {
    var dashCasedPropertyName = camelCaseToDashCase(propertyName);
    if (getDOM().isCommentNode(renderElement)) {
      const existingBindings = getDOM().getText(renderElement)
        .replace(/\n/g, '')
        .match(TEMPLATE_BINDINGS_EXP);
      var parsedBindings = JSON.parse(existingBindings[1]);
      (parsedBindings as any)[dashCasedPropertyName] = propertyValue;
      getDOM().setText(
        renderElement,
        TEMPLATE_COMMENT_TEXT.replace('{}', JSON.stringify(parsedBindings)));
    } else {
      this.setElementAttribute(renderElement, propertyName, propertyValue);
    }
  }

  setElementClass(renderElement: any, className: string, isAdd: boolean): void {
    if (isAdd) {
      getDOM().addClass(renderElement, className);
    } else {
      getDOM().removeClass(renderElement, className);
    }
  }

  setElementStyle(renderElement: any, styleName: string, styleValue: string): void {
    if (isPresent(styleValue)) {
      getDOM().setStyle(renderElement, styleName, stringify(styleValue));
    } else {
      getDOM().removeStyle(renderElement, styleName);
    }
  }

  invokeElementMethod(renderElement: any, methodName: string, args: any[]): void {
    getDOM().invoke(renderElement, methodName, args);
  }

  setText(renderNode: any, text: string): void {
    getDOM().setText(renderNode, text);
  }

  animate(
      element: any, startingStyles: any/*AnimationStyles*/, keyframes: any[]/* AnimationKeyframe[] */,
      duration: number, delay: number, easing: string): any { /*AnimationPlayer*/
    return this._animationDriver.animate(element, startingStyles, keyframes, duration, delay, easing);
  }
}



export class NodeDomRenderer extends DomRenderer {
  __rootRenderer: any;
  constructor(
    _rootRenderer: NodeDomRootRenderer,
    _componentProto: RenderComponentType,
    _animationDriver: AnimationDriver) {

    if (_componentProto.encapsulation === ViewEncapsulation.Native) {
      _componentProto.encapsulation = ViewEncapsulation.Emulated;
    }

    super(_rootRenderer, _componentProto, _animationDriver);
    this.__rootRenderer = _rootRenderer;
  }

  selectRootElement(selectorOrNode: string|any, _debugInfo: any): any { /* Element */
    var el: any;
    if (typeof selectorOrNode === 'string') {
      // el = parseFragment(`<${selectorOrNode}></${selectorOrNode}>`);
      el = getDOM().querySelector(this.__rootRenderer.document, selectorOrNode);
      if (isBlank(el)) {
        throw new Error(`The selector "${selectorOrNode}" did not match any elements`);
      }
    } else {
      el = selectorOrNode;
    }
    getDOM().clearNodes(el);
    return el;
  }

  _isObject(val) {
    if (val === null) {
      return false;
    }
    return ( (typeof val === 'function') || (typeof val === 'object') );
  }

  setElementProperty(renderElement: any, propertyName: string, propertyValue: any) {

    // Fix for passing in custom Object
    if (this._isObject(propertyValue)) {
      propertyValue = JSON.stringify(propertyValue);
    } else if (typeof propertyValue === 'number') {
      propertyValue.toString();
    }

    // Fix for issues caused by null passed in
    if (propertyValue === null || propertyValue === undefined) {
      propertyValue = false;
      if (propertyName === 'innerHTML') {
        propertyValue = '';
      }
    }
    if (propertyName === 'innerHTML') {
      return super.setElementProperty(renderElement, propertyName, propertyValue);
    }
    // ignore boolean prop values for parse5 serialize
    if ((propertyName === 'autofocus' || propertyName === 'spellcheck') && propertyValue === false) {
        return;
    }

    let setProp = super.setElementProperty(renderElement, propertyName, propertyValue);
    if (IGNORE_ATTRIBUTES[propertyName]) {
      return setProp;
    }

    let el = getDOM().nodeName(renderElement);
    let attrList = ATTRIBUTES[el];
    if (attrList) {
      let booleanAttr = listContains(attrList, propertyName);
      if (booleanAttr) {
        if (propertyName === 'autocomplete') {
          return this._setOnOffAttribute(renderElement, propertyName, propertyValue);
        } else if (propertyName === 'checked') {
          return this._setCheckedAttribute(renderElement, propertyName, propertyValue);
        } else if (propertyName === 'disabled') {
          return this._setDisabledAttribute(renderElement, propertyName, propertyValue);
        } else {
          return this._setBooleanAttribute(renderElement, propertyName, propertyValue);
        }
      }
    }
    if (typeof propertyValue === 'string') {
        return super.setElementAttribute(renderElement, propertyName, propertyValue);
    }
  }

  setElementStyle(renderElement: any, styleName: string, styleValue: string): void {
    let styleNameCased = cssHyphenate(styleName);
    return super.setElementStyle(renderElement, styleNameCased, styleValue);
  }

  invokeElementMethod(renderElement: any, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      if (getDOM().nodeName(renderElement) === 'input') {
        return super.setElementAttribute(renderElement, 'autofocus', '');
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

  _setDisabledAttribute(renderElement, _propertyName, propertyValue) {
    if (isPresent(propertyValue)) {
      if (propertyValue === true || propertyValue.toString() !== 'false') {
        return super.setElementAttribute(renderElement, 'disabled', 'disabled');
      }
    }
  }

  _setCheckedAttribute(renderElement, _propertyName, propertyValue) {
    if (isPresent(propertyValue)) {
      if (propertyValue === true) {
        return super.setElementAttribute(renderElement, propertyValue, 'checked');
      } else if (propertyValue === false) {
        return super.setElementAttribute(renderElement, propertyValue, '');
      }
    }
  }

  _setOnOffAttribute(renderElement, propertyName, propertyValue) {
    if (isPresent(propertyValue)) {
      if (propertyValue === true) {
        return super.setElementAttribute(renderElement, propertyValue, 'on');
      } else if (propertyValue === false) {
        return super.setElementAttribute(renderElement, propertyValue, 'off');
      }
    }
    return super.setElementAttribute(renderElement, propertyName, propertyValue);

  }
  _setBooleanAttribute(renderElement, propertyName, propertyValue) {
    if (isPresent(propertyValue) && propertyValue !== false) {
      if (propertyValue === true) {
        return super.setElementAttribute(renderElement, propertyName, '');
      } else {
        return super.setElementAttribute(renderElement, propertyName, propertyValue);
      }
    }
    return super.setElementAttribute(renderElement, propertyName, propertyValue);
  }
}

function moveNodesAfterSibling(sibling: any, nodes: any) {
  var parent = getDOM().parentElement(sibling);
  if (nodes.length > 0 && isPresent(parent)) {
    var nextSibling = getDOM().nextSibling(sibling);
    if (isPresent(nextSibling)) {
      for (var i = 0; i < nodes.length; i++) {
        getDOM().insertBefore(nextSibling, nodes[i]);
      }
    } else {
      for (var i = 0; i < nodes.length; i++) {
        getDOM().appendChild(parent, nodes[i]);
      }
    }
  }
}

function appendNodes(parent: any, nodes: any) {
  for (var i = 0; i < nodes.length; i++) {
    getDOM().appendChild(parent, nodes[i]);
  }
}

function decoratePreventDefault(eventHandler: Function): Function {
  return (event: any) => {
    var allowDefaultBehavior = eventHandler(event);
    if (allowDefaultBehavior === false) {
      // TODO(tbosch): move preventDefault into event plugins...
      getDOM().preventDefault(event);
    }
  };
}

var COMPONENT_REGEX = /%COMP%/g;
// @internal
export const COMPONENT_VARIABLE = '%COMP%';
// @internal
export const HOST_ATTR = `_nghost-${COMPONENT_VARIABLE}`;
// @internal
export const CONTENT_ATTR = `_ngcontent-${COMPONENT_VARIABLE}`;

function _shimContentAttribute(componentShortId: string): string {
  // return CONTENT_ATTR;
  return CONTENT_ATTR.replace(COMPONENT_REGEX, componentShortId);
}

function _shimHostAttribute(componentShortId: string): string {
  // return HOST_ATTR
  return HOST_ATTR.replace(COMPONENT_REGEX, componentShortId);
}

function _flattenStyles(compId: string, styles: Array<any|any[]>, target: string[]): string[] {
  for (var i = 0; i < styles.length; i++) {
    var style = styles[i];
    if (Array.isArray(style)) {
      _flattenStyles(compId, style, target);
    } else {
      style = style.replace(COMPONENT_REGEX, compId);
      target.push(style);
    }
  }
  return target;
}

const NS_PREFIX_RE = /^:([^:]+):(.+)$/;

function splitNamespace(name: string): string[] {
  if (name[0] !== ':') {
    return [null, name];
  }
  const match = name.match(NS_PREFIX_RE);
  return [match[1], match[2]];
}
