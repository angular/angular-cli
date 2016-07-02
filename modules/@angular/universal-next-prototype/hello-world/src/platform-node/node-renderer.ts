import {
  provide,
  Inject,
  Injectable,
  Renderer,
  RenderComponentType,
  Injector
} from '@angular/core';

import {DOCUMENT} from '@angular/platform-browser';
import {DomRenderer, DomRootRenderer, DomRootRenderer_} from '@angular/platform-browser/src/dom/dom_renderer';

import {AnimationDriver} from '@angular/core/src/animation/animation_driver';

import {WebAnimationsDriver} from '@angular/platform-browser/src/dom/web_animations_driver';
import {EventManager} from '@angular/platform-browser/src/dom/events/event_manager';
import {DomSharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {ViewEncapsulation} from '@angular/core';

import {
  cssHyphenate,
  isPresent,
  isBlank,
  listContains,
  PROXY_DOCUMENT
} from './helper';
export {PROXY_DOCUMENT} from './helper';

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';

import {parseFragment} from './node-document'

@Injectable()
export class NodeDomRootRenderer_ extends DomRootRenderer {
  doc;
  constructor(@Inject(DOCUMENT) document: any = null, _eventManager: EventManager,
              sharedStylesHost: DomSharedStylesHost, animationDriver: AnimationDriver) {
    super(null, _eventManager, sharedStylesHost, animationDriver);
    console.log('NodeDomRootRenderer_NodeDomRootRenderer_')
  }
  renderComponent(componentProto: RenderComponentType): Renderer {
    // TODO(gdi2290): see PR https://github.com/angular/angular/pull/6584
    var renderer = this.registeredComponents.get(componentProto.id);
    if (isBlank(renderer)) {
      renderer = new NodeDomRenderer(this, componentProto, this.animationDriver);
      this.registeredComponents.set(componentProto.id, renderer);
    }
    return renderer;
  }
  setDoc(doc) {
    console.log('setDocsetDocsetDoc')
    this.doc = doc
  }
  getDoc(doc) {
    console.log('getDocgetDocgetDocgetDoc')
    return this.doc;
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

export class NodeDomRenderer extends DomRenderer implements Renderer {
  __rootRenderer;
  constructor(
    _rootRenderer: DomRootRenderer,
    _componentProto: RenderComponentType,
    _animationDriver: AnimationDriver) {

    if (_componentProto.encapsulation === ViewEncapsulation.Native) {
      _componentProto.encapsulation = ViewEncapsulation.Emulated;
    }

    super(_rootRenderer, _componentProto, _animationDriver);
    this.__rootRenderer = _rootRenderer;
    console.log('NodeDomRenderer')
  }

  selectRootElement(selectorOrNode: string|any, debugInfo: any): Element {
    console.log('selectRootElement');
    var el: any /** TODO #9100 */;
    if (typeof selectorOrNode === 'string') {
      console.log('SELEELCTOR ROOT', selectorOrNode);
      el = parseFragment(`<${selectorOrNode}></${selectorOrNode}>`);
      this.__rootRenderer.setDoc(el);
      // el = getDOM().querySelector(this.__rootRenderer.getDoc(), selectorOrNode);
      if (isBlank(el)) {
        throw new Error(`The selector "${selectorOrNode}" did not match any elements`);
      }
    } else {
      el = selectorOrNode;
    }
    getDOM().clearNodes(el);
    return el;
  }

  setElementProperty(renderElement: any, propertyName: string, propertyValue: any) {
    super.setElementProperty(renderElement, propertyName, propertyValue);

    let el = getDOM().nodeName(renderElement);
    let attrList = ATTRIBUTES[el];
    if (attrList) {
      let booleanAttr = listContains(attrList, propertyName);
      if (booleanAttr) {
        if (propertyName === 'autocomplete') {
          return this._setOnOffAttribute(renderElement, propertyName, propertyValue);
        } else if (propertyName === 'checked') {
          return this._setCheckedAttribute(renderElement, propertyName, propertyValue);
        } else {
          return this._setBooleanAttribute(renderElement, propertyName, propertyValue);
        }
      }
    }
    return super.setElementAttribute(renderElement, propertyName, propertyValue);
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

  _setCheckedAttribute(renderElement, propertyName, propertyValue) {
    if (isPresent(propertyValue)) {
      if (propertyValue === true) {
        return super.setElementAttribute(renderElement, propertyValue, 'checked');
      } else if (propertyValue = false) {
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
