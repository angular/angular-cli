import {
  isPresent,
  isBlank,
  stringify
} from 'angular2/src/facade/lang';
import {ListWrapper} from 'angular2/src/facade/collection';
import {
  provide,
  Inject,
  Injectable,
  Renderer,
  RenderComponentType
} from 'angular2/core';

import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {DomRenderer, DomRootRenderer, DomRootRenderer_} from 'angular2/src/platform/dom/dom_renderer';

import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {EventManager} from 'angular2/src/platform/dom/events/event_manager';
import {DomSharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {ViewEncapsulation} from 'angular2/src/core/metadata';

import {cssHyphenate} from '../../helper';

@Injectable()
export class NodeDomRootRenderer_ extends DomRootRenderer {
  constructor(@Inject(DOCUMENT) _document: any, _eventManager: EventManager,
              sharedStylesHost: DomSharedStylesHost, animate: AnimationBuilder) {
    super(_document, _eventManager, sharedStylesHost, animate);
  }
  renderComponent(componentProto: RenderComponentType): Renderer {
    // TODO(gdi2290): see PR https://github.com/angular/angular/pull/6584
    var renderer = (<any>this)._registeredComponents.get(componentProto.id);
    if (isBlank(renderer)) {
      renderer = new NodeDomRenderer(this, componentProto);
      (<any>this)._registeredComponents.set(componentProto.id, renderer);
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

export class NodeDomRenderer extends DomRenderer {
  constructor(_rootRenderer: DomRootRenderer | any, _componentProto: RenderComponentType) {
    if (_componentProto.encapsulation === ViewEncapsulation.Native) {
      _componentProto.encapsulation = ViewEncapsulation.Emulated;
    }
    super(_rootRenderer, _componentProto);
  }

  setElementProperty(renderElement: any, propertyName: string, propertyValue: any) {
    super.setElementProperty(renderElement, propertyName, propertyValue);

    let el = DOM.nodeName(renderElement);
    let attrList = ATTRIBUTES[el];
    if (attrList) {
      let booleanAttr = ListWrapper.contains(attrList, propertyName);
      if (booleanAttr) {
        if (propertyName === 'autocomplete') {
          return this._setOnOffAttribute(renderElement, propertyName, propertyValue);
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
      if (DOM.nodeName(renderElement) === 'input') {
        return super.setElementAttribute(renderElement, 'autofocus', '');
      }

    }
    return super.invokeElementMethod(location, methodName, args);
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
