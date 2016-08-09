import {
  provide,
  Inject,
  Injectable,
  Renderer,
  RenderComponentType,
  Injector,
  ViewEncapsulation
} from '@angular/core';

import {
  DOCUMENT,
  AnimationDriver,
  EventManager,
} from '@angular/platform-browser';

// PRIVATE
import { DomRenderer, DomRootRenderer } from '@angular/platform-browser/src/dom/dom_renderer';
import { DomSharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';
// PRIVATE


import {
  cssHyphenate,
  isPresent,
  isBlank,
  listContains,
} from './helper';

import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';

import {parseFragment} from '@angular/universal'

@Injectable()
export class NodeDomRootRenderer_ extends DomRootRenderer {
  __document;
  constructor(@Inject(DOCUMENT) document: any, _eventManager: EventManager,
              sharedStylesHost: DomSharedStylesHost, animationDriver: AnimationDriver) {
    super(null, _eventManager, sharedStylesHost, animationDriver);
    this.__document = document;
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

export class NodeDomRenderer extends DomRenderer {
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
  }

  selectRootElement(selectorOrNode: string|any, debugInfo: any): Element {
    var el: any /** TODO #9100 */;
    if (typeof selectorOrNode === 'string') {
      // el = parseFragment(`<${selectorOrNode}></${selectorOrNode}>`);
      el = getDOM().querySelector(this.__rootRenderer.__document, selectorOrNode);
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
    }else if(typeof propertyValue === 'number'){
      propertyValue.toString()
    }

    // Fix for issues caused by null passed in
    if (propertyValue === null || propertyValue === undefined) {
        propertyValue = false;
        if (propertyName === 'innerHTML') {
            propertyValue = '';
        }
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

  _setDisabledAttribute(renderElement, propertyName, propertyValue) {
    if (isPresent(propertyValue)) {
      if (propertyValue === true || propertyValue.toString() !== 'false') {
        return super.setElementAttribute(renderElement, 'disabled', 'disabled');
      }
    }
  }

  _setCheckedAttribute(renderElement, propertyName, propertyValue) {
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
