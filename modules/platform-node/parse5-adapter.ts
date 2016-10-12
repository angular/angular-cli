import {
  DomAdapter,
  setRootDomAdapter,
  SelectorMatcher,
  CssSelector
} from './__private_imports__';
const parse5: any = require('parse5');

import {
  ListWrapper,
  isPresent,
  isBlank,
  setValueOnPath,
} from './helper';

// **** ^ All replaced ****

declare var Zone: any;

let treeAdapter: any = null;

const _attrToPropMap: {[key: string]: string} = {
  'class': 'className',
  'innerHtml': 'innerHTML',
  'readonly': 'readOnly',
  'tabindex': 'tabIndex',
};

// let defDoc: any = null;

const mapProps = ['attribs', 'x-attribsNamespace', 'x-attribsPrefix'];

function _notImplemented(methodName: string) {
  return new Error('This method is not implemented in Parse5DomAdapter: ' + methodName);
}

/* tslint:disable:requireParameterType */
/**
 * A `DomAdapter` powered by the `parse5` NodeJS module.
 *
 * @security Tread carefully! Interacting with the DOM directly is dangerous and
 * can introduce XSS risks.
 */
export class Parse5DomAdapter extends DomAdapter {

  static makeCurrent() {
    treeAdapter = parse5.treeAdapters.htmlparser2;
    setRootDomAdapter(new Parse5DomAdapter());
  }

  parse(_templateHtml: string) { throw _notImplemented('parse'); }

  hasProperty(_element: any, name: string): boolean {
    /* tslint:disable */
    return _HTMLElementPropertyList.indexOf(name) > -1;
    /* tslint:enable */
  }
  // TODO(tbosch): don't even call this method when we run the tests on server side
  // by not using the DomRenderer in tests. Keeping this for now to make tests happy...
  setProperty(el: /*element*/ any, name: string, value: any) {
    if (name === 'innerHTML') {
      this.setInnerHTML(el, value);
    } else if (name === 'className') {
      el.attribs['class'] = el.className = value;
    } else {
      el[name] = value;
    }
  }
  // TODO(tbosch): don't even call this method when we run the tests on server side
  // by not using the DomRenderer in tests. Keeping this for now to make tests happy...
  getProperty(el: /*element*/ any, name: string): any { return el[name]; }

  invoke(_el: any /* Element */, _methodName: string, _args: any[]): any {
    
    switch (_methodName) {
      case 'createElement': return this.createElement(_args[0]);
      case 'query': return this.query(_args[0]);
      case 'querySelector': return this.querySelector(_el, _args[0]);
      case 'querySelectorAll': return this.querySelectorAll(_el, _args[0]);
      default:
        throw _notImplemented('invoke'); 
    }
  }
  
  logError(error: string) { console.error(error); }
  log(error: string) { console.log(error); }
  logGroup(error: string) { console.error(error); }
  logGroupEnd() {}

  get attrToPropMap() { return _attrToPropMap; }

  query(_selector: any) {
    const document = Zone.current.get('document');
    if (document) {
      return this.querySelector(document, _selector);
    }
    throw _notImplemented('query');
  }
  querySelector(el: any, selector: string): any { return this.querySelectorAll(el, selector)[0]; }
  querySelectorAll(el: any, selector: string): any[] {
    const res: any[] = [];
    const _recursive = (result: any, node: any, selector: any, matcher: any) => {
      let cNodes = node.childNodes;
      if (cNodes && cNodes.length > 0) {
        for (let i = 0; i < cNodes.length; i++) {
          const childNode = cNodes[i];
          if (this.elementMatches(childNode, selector, matcher)) {
            result.push(childNode);
          }
          _recursive(result, childNode, selector, matcher);
        }
      }
    };
    const matcher = new SelectorMatcher();
    matcher.addSelectables(CssSelector.parse(selector));
    _recursive(res, el, selector, matcher);
    return res;
  }
  elementMatches(node: any, selector: string, matcher: any = null): boolean {
    if (this.isElementNode(node) && selector === '*') {
      return true;
    }
    let result = false;
    if (selector && selector.charAt(0) == '#') {
      result = this.getAttribute(node, 'id') == selector.substring(1);
    } else if (selector) {
      if (!matcher) {
        matcher = new SelectorMatcher();
        matcher.addSelectables(CssSelector.parse(selector));
      }

      const cssSelector = new CssSelector();
      cssSelector.setElement(this.tagName(node));
      if (node.attribs) {
        for (const attrName in node.attribs) {
          if (node.attribs.hasOwnProperty(attrName)) {
          cssSelector.addAttribute(attrName, node.attribs[attrName]);
          }
        }
      }
      const classList = this.classList(node);
      for (let i = 0; i < classList.length; i++) {
        cssSelector.addClassName(classList[i]);
      }

      matcher.match(cssSelector, function(_selector: any, _cb: any) { result = true; });
    }
    return result;
  }
  on(el: any, evt: any, listener: any) {
    let listenersMap: {[k: string]: any} = el._eventListenersMap;
    if (!listenersMap) {
      listenersMap = {};
      el._eventListenersMap = listenersMap;
    }
    const listeners = listenersMap[evt] || [];
    listenersMap[evt] = [...listeners, listener];
  }
  onAndCancel(el: any, evt: any, listener: any): Function {
    this.on(el, evt, listener);
    return () => { ListWrapper.remove(<any[]>(el._eventListenersMap[evt]), listener); };
  }
  dispatchEvent(el: any, evt: any) {
    if (!evt.target) {
      evt.target = el;
    }
    if (el._eventListenersMap) {
      const listeners: any = el._eventListenersMap[evt.type];
      if (listeners) {
        for (let i = 0; i < listeners.length; i++) {
          listeners[i](evt);
        }
      }
    }
    if (el.parent) {
      this.dispatchEvent(el.parent, evt);
    }
    if (el._window) {
      this.dispatchEvent(el._window, evt);
    }
  }
  createMouseEvent(eventType: any): any /* Event */ { return this.createEvent(eventType); }
  createEvent(eventType: string): any /* Event */ {
    let event = /* <Event> */{
      type: eventType,
      defaultPrevented: false,
      preventDefault: () => { (<any>event).defaultPrevented = true; }
    };
    return event;
  }
  preventDefault(event: any) { event.returnValue = false; }
  isPrevented(event: any): boolean { return isPresent(event.returnValue) && !event.returnValue; }
  getInnerHTML(el: any): string {
    return parse5.serialize(this.templateAwareRoot(el), {treeAdapter});
  }
  getTemplateContent(_el: any): any /* Node */ { return null; }
  getOuterHTML(el: any): string {
    const fragment = treeAdapter.createDocumentFragment();
    this.appendChild(fragment, el);
    return parse5.serialize(fragment, {treeAdapter});
  }
  nodeName(node: any): string { return node.tagName; }
  nodeValue(node: any): string { return node.nodeValue; }
  type(_node: any): string { throw _notImplemented('type'); }
  content(node: any): string { return node.childNodes[0]; }
  firstChild(el: any): any /* Node */ { return el.firstChild; }
  nextSibling(el: any): any /* Node */ { return el.nextSibling; }
  parentElement(el: any): any /* Node */ { return el.parent; }
  childNodes(el: any): any[] /* Node */ { return el.childNodes; }
  childNodesAsList(el: any): any[] {
    const childNodes = el.childNodes;
    const res = new Array(childNodes.length);
    for (let i = 0; i < childNodes.length; i++) {
      res[i] = childNodes[i];
    }
    return res;
  }
  clearNodes(el: any) {
    while (el.childNodes.length > 0) {
      this.remove(el.childNodes[0]);
    }
  }
  appendChild(el: any, node: any) {
    this.remove(node);
    treeAdapter.appendChild(this.templateAwareRoot(el), node);
  }
  removeChild(el: any, node: any) {
    if (el.childNodes.indexOf(node) > -1) {
      this.remove(node);
    }
  }
  replaceChild(_el: any, _newNode: any, _oldNode: any) { throw _notImplemented('replaceChild'); }
  
  remove(el: any): any /* HTMLElement */ {
    const parent = el.parent;
    if (parent) {
      const index = parent.childNodes.indexOf(el);
      parent.childNodes.splice(index, 1);
    }
    const prev = el.previousSibling;
    const next = el.nextSibling;
    if (prev) {
      prev.next = next;
    }
    if (next) {
      next.prev = prev;
    }
    el.prev = null;
    el.next = null;
    el.parent = null;
    return el;
  }
  insertBefore(el: any, node: any) {
    this.remove(node);
    treeAdapter.insertBefore(el.parent, node, el);
  }
  insertAllBefore(el: any, nodes: any) { nodes.forEach((n: any) => this.insertBefore(el, n)); }
  insertAfter(el: any, node: any) {
    if (el.nextSibling) {
      this.insertBefore(el.nextSibling, node);
    } else {
      this.appendChild(el.parent, node);
    }
  }
  setInnerHTML(el: any, value: any) {
    this.clearNodes(el);
    const content = parse5.parseFragment(value, {treeAdapter});
    for (let i = 0; i < content.childNodes.length; i++) {
      treeAdapter.appendChild(el, content.childNodes[i]);
    }
  }
  getText(el: any, isRecursive?: boolean): string {
    if (this.isTextNode(el)) {
      return el.data;
    }

    if (this.isCommentNode(el)) {
      // In the DOM, comments within an element return an empty string for textContent
      // However, comment node instances return the comment content for textContent getter
      return isRecursive ? '' : el.data;
    }

    if (!el.childNodes || el.childNodes.length == 0) {
      return '';
    }

    let textContent = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      textContent += this.getText(el.childNodes[i], true);
    }
    return textContent;
  }

  setText(el: any, value: string) {
    if (this.isTextNode(el) || this.isCommentNode(el)) {
      el.data = value;
    } else {
      this.clearNodes(el);
      if (value !== '') {
        treeAdapter.insertText(el, value);
      }
    }
  }

  getValue(el: any): string { return el.value; }
  setValue(el: any, value: string) { el.value = value; }
  getChecked(el: any): boolean { return el.checked; }
  setChecked(el: any, value: boolean) { el.checked = value; }

  createComment(text: string): any /* Comment */ { return treeAdapter.createCommentNode(text); }
  createTemplate(html: any): any /* HTMLElement */ {
    const template = treeAdapter.createElement('template', 'http://www.w3.org/1999/xhtml', []);
    const content = parse5.parseFragment(html, {treeAdapter});
    treeAdapter.setTemplateContent(template, content);
    return template;
  }
  createElement(tagName: any): any /* HTMLElement */ {
    return treeAdapter.createElement(tagName, 'http://www.w3.org/1999/xhtml', []);
  }
  createElementNS(ns: any, tagName: any): any /* HTMLElement */ {
    return treeAdapter.createElement(tagName, ns, []);
  }
  createTextNode(text: string): any /* Text */ {
    const t = <any>this.createComment(text);
    t.type = 'text';
    return t;
  }
  createScriptTag(attrName: string, attrValue: string): any /* HTMLElement */ {
    return treeAdapter.createElement(
      'script', 'http://www.w3.org/1999/xhtml', [{name: attrName, value: attrValue}]);
  }
  createStyleElement(css: string): any /* HTMLStyleElement */ {
    const style = this.createElement('style');
    this.setText(style, css);
    return /*<HTMLStyleElement>*/style;
  }
  createShadowRoot(el: any): any /* HTMLElement */ {
    el.shadowRoot = treeAdapter.createDocumentFragment();
    el.shadowRoot.parent = el;
    return el.shadowRoot;
  }
  getShadowRoot(el: any): any /* Element */ { return el.shadowRoot; }
  getHost(el: any): string { return el.host; }
  getDistributedNodes(_el: any): any /* Node */[] { throw _notImplemented('getDistributedNodes'); }
  clone(node: any /* Node */): any /* Node */ {
    const _recursive = (node: any) => {
      const nodeClone = Object.create(Object.getPrototypeOf(node));
      for (const prop in node) {
        if (node.hasOwnProperty(prop)) {
          const desc = Object.getOwnPropertyDescriptor(node, prop);
          if (desc && 'value' in desc && typeof desc.value !== 'object') {
            nodeClone[prop] = node[prop];
          }
        }
      }
      nodeClone.parent = null;
      nodeClone.prev = null;
      nodeClone.next = null;
      nodeClone.children = null;

      mapProps.forEach(mapName => {
        if (isPresent(node[mapName])) {
          nodeClone[mapName] = {};
          for (const prop in node[mapName]) {
            if (node[mapName].hasOwnProperty(prop)) {
              nodeClone[mapName][prop] = node[mapName][prop];
            }
          }
        }
      });
      const cNodes = node.children;
      if (cNodes) {
        const cNodesClone = new Array(cNodes.length);
        for (let i = 0; i < cNodes.length; i++) {
          const childNode = cNodes[i];
          const childNodeClone = _recursive(childNode);
          cNodesClone[i] = childNodeClone;
          if (i > 0) {
            childNodeClone.prev = cNodesClone[i - 1];
            cNodesClone[i - 1].next = childNodeClone;
          }
          childNodeClone.parent = nodeClone;
        }
        nodeClone.children = cNodesClone;
      }
      return nodeClone;
    };
    return _recursive(node);
  }
  getElementsByClassName(element: any, name: string): any /* HTMLElement */[] {
    return this.querySelectorAll(element, '.' + name);
  }
  getElementsByTagName(_element: any, _name: string): any /* HTMLElement */[] {
    throw _notImplemented('getElementsByTagName');
  }
  classList(element: any): string[] {
    let classAttrValue: any = null;
    const attributes = element.attribs;
    if (attributes && attributes.hasOwnProperty('class')) {
      classAttrValue = attributes['class'];
    }
    return classAttrValue ? classAttrValue.trim().split(/\s+/g) : [];
  }
  addClass(element: any, className: string) {
    const classList = this.classList(element);
    let index = classList.indexOf(className);
    if (index == -1) {
      classList.push(className);
      element.attribs['class'] = element.className = classList.join(' ');
    }
  }
  removeClass(element: any, className: string) {
    const classList = this.classList(element);
    let index = classList.indexOf(className);
    if (index > -1) {
      classList.splice(index, 1);
      element.attribs['class'] = element.className = classList.join(' ');
    }
  }
  hasClass(element: any, className: string): boolean {
    return ListWrapper.contains(this.classList(element), className);
  }
  hasStyle(element: any, styleName: string, styleValue: string = null): boolean {
    const value = this.getStyle(element, styleName) || '';
    return styleValue ? value == styleValue : value.length > 0;
  }
  /** @internal */
  _readStyleAttribute(element: any) {
    const styleMap = {};
    const attributes = element.attribs;
    if (attributes && attributes.hasOwnProperty('style')) {
      const styleAttrValue = attributes['style'];
      const styleList = styleAttrValue.split(/;+/g);
      for (let i = 0; i < styleList.length; i++) {
        if (styleList[i].length > 0) {
          const elems = styleList[i].split(/:+/g);
          (styleMap as any)[elems[0].trim()] = elems[1].trim();
        }
      }
    }
    return styleMap;
  }
  /** @internal */
  _writeStyleAttribute(element: any, styleMap: any) {
    let styleAttrValue = '';
    for (const key in styleMap) {
      if (styleMap.hasOwnProperty(key)) {
        const newValue = styleMap[key];
        if (newValue) {
          styleAttrValue += key + ':' + styleMap[key] + ';';
        }
      }
    }
    element.attribs['style'] = styleAttrValue;
  }
  setStyle(element: any, styleName: string, styleValue: string) {
    const styleMap = this._readStyleAttribute(element);
    (styleMap as any)[styleName] = styleValue;
    this._writeStyleAttribute(element, styleMap);
  }
  removeStyle(element: any, styleName: string) { this.setStyle(element, styleName, null); }
  getStyle(element: any, styleName: string): string {
    const styleMap = this._readStyleAttribute(element);
    return styleMap.hasOwnProperty(styleName) ? (styleMap as any)[styleName] : '';
  }
  tagName(element: any): string { return element.tagName == 'style' ? 'STYLE' : element.tagName; }
  attributeMap(element: any): Map<string, string> {
    const res = new Map<string, string>();
    const elAttrs = treeAdapter.getAttrList(element);
    for (let i = 0; i < elAttrs.length; i++) {
      const attrib = elAttrs[i];
      res.set(attrib.name, attrib.value);
    }
    return res;
  }
  hasAttribute(element: any, attribute: string): boolean {
    return element.attribs && element.attribs.hasOwnProperty(attribute);
  }
  hasAttributeNS(_element: any, _ns: string, _attribute: string): boolean { throw _notImplemented('hasAttributeNS'); }
  getAttribute(element: any, attribute: string): string {
    return element.attribs && element.attribs.hasOwnProperty(attribute) ?
        element.attribs[attribute] :
        null;
  }
  getAttributeNS(_element: any, _ns: string, _attribute: string): string { throw _notImplemented('getAttributeNS'); }
  setAttribute(element: any, attribute: string, value: string) {
    if (attribute) {
      element.attribs[attribute] = value;
      if (attribute === 'class') {
        element.className = value;
      }
    }
  }
  setAttributeNS(_element: any, _ns: string, _attribute: string, _value: string) {
    throw _notImplemented('setAttributeNS');
  }
  removeAttribute(element: any, attribute: string) {
    if (attribute) {
      delete element.attribs[attribute];
    }
  }
  removeAttributeNS(_element: any, _ns: string, _name: string) { throw _notImplemented('removeAttributeNS'); }
  templateAwareRoot(el: any): any {
    return this.isTemplateElement(el) ? treeAdapter.getTemplateContent(el) : el;
  }
  createHtmlDocument(): any /* Document */ {
    const newDoc = treeAdapter.createDocument();
    newDoc.title = 'fake title';
    const head = treeAdapter.createElement('head', null, []);
    const body = treeAdapter.createElement('body', 'http://www.w3.org/1999/xhtml', []);
    this.appendChild(newDoc, head);
    this.appendChild(newDoc, body);
    newDoc['head'] = head;
    newDoc['body'] = body;
    newDoc['_window'] = {};
    return newDoc;
  }
  // Universal Fix
  defaultDoc(): any /* Document */ { 

    const document = Zone.current.get('document');
    if (document) {
      return document;
    }
    return {documentMode: false};
  }

  getBoundingClientRect(_el: any): any { return {left: 0, top: 0, width: 0, height: 0}; }

  // Universal Fix
  getTitle(): string { 
    const document = Zone.current.get('document');
    if (document && document.title) {
      return document.title;
    }
    throw _notImplemented('getTitle');
  }

  setTitle(newTitle: string) { this.defaultDoc().title = newTitle; }
  isTemplateElement(el: any): boolean {
    return this.isElementNode(el) && this.tagName(el) === 'template';
  }
  isTextNode(node: any): boolean { return treeAdapter.isTextNode(node); }
  isCommentNode(node: any): boolean { return treeAdapter.isCommentNode(node); }
  isElementNode(node: any): boolean { return node ? treeAdapter.isElementNode(node) : false; }
  hasShadowRoot(node: any): boolean { return isPresent(node.shadowRoot); }
  isShadowRoot(node: any): boolean { return this.getShadowRoot(node) == node; }
  importIntoDoc(node: any): any { return this.clone(node); }
  adoptNode(node: any): any { return node; }
  getHref(el: any): string { return el.href || this.getAttribute(el, 'href'); }
  getEventKey(_event: any): string { throw _notImplemented('getEventKey'); }
  resolveAndSetHref(el: any, baseUrl: string, href: string) {
    if (href == null) {
      el.href = baseUrl;
    } else {
      el.href = baseUrl + '/../' + href;
    }
  }
  /** @internal */
  _buildRules(parsedRules: any, css?: any) {
    const rules: any[] = [];
    for (let i = 0; i < parsedRules.length; i++) {
      const parsedRule = parsedRules[i];
      const rule: {[key: string]: any} = {};
      rule['cssText'] = css;
      rule['style'] = {content: '', cssText: ''};
      if (parsedRule.type == 'rule') {
        rule['type'] = 1;

        rule['selectorText'] =
            parsedRule.selectors.join(', '.replace(/\s{2,}/g, ' ')
                                          .replace(/\s*~\s*/g, ' ~ ')
                                          .replace(/\s*\+\s*/g, ' + ')
                                          .replace(/\s*>\s*/g, ' > ')
                                          .replace(/\[(\w+)=(\w+)\]/g, '[$1="$2"]'));
        if (isBlank(parsedRule.declarations)) {
          continue;
        }
        for (let j = 0; j < parsedRule.declarations.length; j++) {
          const declaration = parsedRule.declarations[j];
          rule['style'] = declaration.property[declaration.value];
          rule['style'].cssText += declaration.property + ': ' + declaration.value + ';';
        }
      } else if (parsedRule.type == 'media') {
        rule['type'] = 4;
        rule['media'] = {mediaText: parsedRule.media};
        if (parsedRule.rules) {
          rule['cssRules'] = this._buildRules(parsedRule.rules);
        }
      }
      rules.push(rule);
    }
    return rules;
  }
  supportsDOMEvents(): boolean { return false; }
  supportsNativeShadowDOM(): boolean { return false; }
  // Universal Fix
  getGlobalEventTarget(target: string): any {
    if (target == 'window') {
      return (<any>this.defaultDoc())._window;
    } else if (target == 'document') {
      return this.defaultDoc();
    } else if (target == 'body') {
      return this.defaultDoc().body;
    }
  }
  getBaseHref(): string { 
    const document = Zone.current.get('document');
    if (document) {
      const base = this.querySelector(document, 'base');
      if (base) {
        const href = this.getHref(base);
        if (href) {
          return href;
        }
      }
    }
    throw _notImplemented('getBaseHref'); 
  }
  resetBaseElement(): void { throw _notImplemented('resetBaseElement'); }
  getHistory() : any /* History */ { 
    const history = Zone.current.get('history');
    if (history) {
      return history;
    } 
    throw _notImplemented('getHistory');
  }
  getLocation(): any /* Location */ { 
    const location = Zone.current.get('location'); 
    if (location) {
      return location;
    } 
    throw _notImplemented('getLocation');   
  }
  getUserAgent(): string { 
    const navigator = Zone.current.get('navigator');

    if (navigator && navigator.userAgent) {
      return navigator.userAgent;
    }
    throw _notImplemented('getUserAgent');
  }
  getData(el: any, name: string): string { return this.getAttribute(el, 'data-' + name); }
  getComputedStyle(_el: any): any { throw _notImplemented('getComputedStyle'); }
  setData(el: any, name: string, value: string) { this.setAttribute(el, 'data-' + name, value); }
  // TODO(tbosch): move this into a separate environment class once we have it
  setGlobalVar(path: string, value: any) { setValueOnPath(global, path, value); }
  supportsWebAnimation(): boolean { return false; }
  performanceNow(): number { return Date.now(); }
  getAnimationPrefix(): string { return ''; }
  getTransitionEnd(): string { return 'transitionend'; }
  supportsAnimation(): boolean { return true; }

  supportsCookies(): boolean { return false; }
  getCookie(_name: string): string { throw _notImplemented('getCookie'); }
  setCookie(_name: string, _value: string) { throw _notImplemented('setCookie'); }
  animate(_element: any, _keyframes: any[], _options: any): any { throw _notImplemented('animate'); }
}

// TODO: build a proper list, this one is all the keys of a HTMLInputElement
const _HTMLElementPropertyList = [
  'webkitEntries',
  'incremental',
  'webkitdirectory',
  'selectionDirection',
  'selectionEnd',
  'selectionStart',
  'labels',
  'validationMessage',
  'validity',
  'willValidate',
  'width',
  'valueAsNumber',
  'valueAsDate',
  'value',
  'useMap',
  'defaultValue',
  'type',
  'step',
  'src',
  'size',
  'required',
  'readOnly',
  'placeholder',
  'pattern',
  'name',
  'multiple',
  'min',
  'minLength',
  'maxLength',
  'max',
  'list',
  'indeterminate',
  'height',
  'formTarget',
  'formNoValidate',
  'formMethod',
  'formEnctype',
  'formAction',
  'files',
  'form',
  'disabled',
  'dirName',
  'checked',
  'defaultChecked',
  'autofocus',
  'autocomplete',
  'alt',
  'align',
  'accept',
  'onautocompleteerror',
  'onautocomplete',
  'onwaiting',
  'onvolumechange',
  'ontoggle',
  'ontimeupdate',
  'onsuspend',
  'onsubmit',
  'onstalled',
  'onshow',
  'onselect',
  'onseeking',
  'onseeked',
  'onscroll',
  'onresize',
  'onreset',
  'onratechange',
  'onprogress',
  'onplaying',
  'onplay',
  'onpause',
  'onmousewheel',
  'onmouseup',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onmouseleave',
  'onmouseenter',
  'onmousedown',
  'onloadstart',
  'onloadedmetadata',
  'onloadeddata',
  'onload',
  'onkeyup',
  'onkeypress',
  'onkeydown',
  'oninvalid',
  'oninput',
  'onfocus',
  'onerror',
  'onended',
  'onemptied',
  'ondurationchange',
  'ondrop',
  'ondragstart',
  'ondragover',
  'ondragleave',
  'ondragenter',
  'ondragend',
  'ondrag',
  'ondblclick',
  'oncuechange',
  'oncontextmenu',
  'onclose',
  'onclick',
  'onchange',
  'oncanplaythrough',
  'oncanplay',
  'oncancel',
  'onblur',
  'onabort',
  'spellcheck',
  'isContentEditable',
  'contentEditable',
  'outerText',
  'innerText',
  'accessKey',
  'hidden',
  'webkitdropzone',
  'draggable',
  'tabIndex',
  'dir',
  'translate',
  'lang',
  'title',
  'childElementCount',
  'lastElementChild',
  'firstElementChild',
  'children',
  'onwebkitfullscreenerror',
  'onwebkitfullscreenchange',
  'nextElementSibling',
  'previousElementSibling',
  'onwheel',
  'onselectstart',
  'onsearch',
  'onpaste',
  'oncut',
  'oncopy',
  'onbeforepaste',
  'onbeforecut',
  'onbeforecopy',
  'shadowRoot',
  'dataset',
  'classList',
  'className',
  'outerHTML',
  'innerHTML',
  'scrollHeight',
  'scrollWidth',
  'scrollTop',
  'scrollLeft',
  'clientHeight',
  'clientWidth',
  'clientTop',
  'clientLeft',
  'offsetParent',
  'offsetHeight',
  'offsetWidth',
  'offsetTop',
  'offsetLeft',
  'localName',
  'prefix',
  'namespaceURI',
  'id',
  'style',
  'attributes',
  'tagName',
  'parentElement',
  'textContent',
  'baseURI',
  'ownerDocument',
  'nextSibling',
  'previousSibling',
  'lastChild',
  'firstChild',
  'childNodes',
  'parentNode',
  'nodeType',
  'nodeValue',
  'nodeName',
  'closure_lm_714617',
  '__jsaction',
];
