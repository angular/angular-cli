import { getDOM } from '../lib';

declare var Zone: any;

export class ProxyElement {
  get _zone() { return this.__zone || Zone.current; }
  constructor(private __zone?: any) { }
  get querySelector() {
    const parentElement = this._zone.get('parentElement');
    const _zone = this._zone.fork({
      name: 'ProxyElement.querySelector',
      properties: { parentElement }
    });
    return _zone.wrap(querySelector, 'ProxyElement.querySelector');
  }
  get querySelectorAll() {
    const parentElement = this._zone.get('parentElement');
    const _zone = this._zone.fork({
      name: 'ProxyElement.querySelectorAll',
      properties: { parentElement }
    });
    return _zone.wrap(querySelectorAll, 'ProxyElement.querySelector');
  }
  get tagName() {
    const el = this._zone.get('element');
    return el.tagName;
  }
  get value() {
    const el = this._zone.get('element');
    return el.value;
  }
  get nodeName() {
    const el = this._zone.get('element');
    return el.tagName;
  }
  get nodeValue() {
    const el = this._zone.get('element');
    return el.nodeValue;
  }
  get firstChild(): any {
    const DOM = getDOM();
    const parentElement = this._zone.get('element');
    const _zone = this._zone.fork({
      name: 'ProxyElement.querySelector',
      properties: { parentElement }
    });
    return _zone.run(() => DOM.firstChild(parentElement));
  }
  get nextSibling() {
    const el = this._zone.get('element');
    return el.nextSibling;
  }
  get parentElement() {
    const el = this._zone.get('element');
    return el.parent;
  }
  get childNodes(): any {
    const DOM = getDOM();
    const parentElement = this._zone.get('element');
    const _zone = this._zone.fork({
      name: 'ProxyElement.querySelector',
      properties: { parentElement }
    });
    return _zone.run(() => DOM.childNodes(parentElement));
  }

  createElement(tagName: any) {
    const DOM = getDOM();
    return DOM.createElement(tagName);
  }
}

export class ProxyDocument {
  get _zone() { return this.__zone || Zone.current; }
  constructor(private __zone?: any) { }
  get querySelector() {
    const document = this._zone.get('document');
    const zone = this._zone.fork({
      name: 'ProxyDocument.querySelector',
      properties: {
        parentElement: document
      }
    });
    return zone.wrap(querySelector, 'ProxyDocument.querySelector');
  }
  get querySelectorAll() {
    const document = this._zone.get('document');
    const _zone = this._zone.fork({
      name: 'ProxyDocument.querySelectorAll',
      properties: {
        parentElement: document
      }
    });
    return _zone.wrap(querySelectorAll, 'ProxyDocument.querySelector');
  }
  get tagName() {
    const el = this._zone.get('document');
    return el.tagName;
  }
  get cookie() {
    const el = this._zone.get('cookie');
    return el.cookie;
  }

  createElement(tagName: any) {
    const DOM = getDOM();
    return DOM.createElement(tagName);
  }
}


export function createDocumentProxy() {
  return new ProxyDocument();
}

export function createGlobalProxy() {

  var originalDocumentRef = (<any>global).document;
  if (originalDocumentRef instanceof ProxyDocument) {
    return originalDocumentRef;
  }

  const document = createDocumentProxy();
  Object.defineProperty((<any>global), 'document', {
    enumerable: false,
    configurable: false,
    get: function() {
      const doc: any = Zone.current.get('document');
      if (doc) {
        return document;
      }
      return originalDocumentRef;
    },
    set: function(_newValue) {

    }
  });

  return document;
}



function querySelector(query) {
  const DOM = getDOM();
  var parentElement = Zone.current.get('parentElement');
  var element = DOM.querySelector(parentElement, query);
  var zone = Zone.current.fork({
    name: 'querySelector',
    properties: { parentElement, element }
  });
  return new ProxyElement(zone);
}

function querySelectorAll(query) {
  const DOM = getDOM();
  var parentElement = Zone.current.get('parentElement');
  var element = DOM.querySelectorAll(parentElement, query);
  var zone = Zone.current.fork({
    name: 'querySelector',
    properties: { parentElement, element }
  });
  return new ProxyElement(zone);
}
