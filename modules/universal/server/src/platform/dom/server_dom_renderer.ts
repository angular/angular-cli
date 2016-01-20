import {
  isPresent,
  isBlank,
  stringify
} from 'angular2/src/facade/lang';
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
export class ServerDomRootRenderer_ extends DomRootRenderer {
  private _registeredComponents: Map<string, DomRenderer>;
  constructor(@Inject(DOCUMENT) _document: any, _eventManager: EventManager,
              sharedStylesHost: DomSharedStylesHost, animate: AnimationBuilder) {
    super(_document, _eventManager, sharedStylesHost, animate);
  }
  renderComponent(componentProto: RenderComponentType): Renderer {
    var renderer = this._registeredComponents.get(componentProto.id);
    if (isBlank(renderer)) {
      renderer = new ServerDomRenderer(this, componentProto);
      this._registeredComponents.set(componentProto.id, renderer);
    }
    return renderer;
  }
}


export class ServerDomRenderer extends DomRenderer {
  constructor(_rootRenderer: DomRootRenderer | any, _componentProto: RenderComponentType) {

    if (_componentProto.encapsulation === ViewEncapsulation.Native) {
      _componentProto.encapsulation = ViewEncapsulation.Emulated;
    }

    super(_rootRenderer, _componentProto);
  }

  setElementProperty(renderElement: any, propertyName: string, propertyValue: any) {
    if (propertyName === 'value' || (propertyName === 'checked' && propertyValue !== false)) {
      if (DOM.nodeName(renderElement) === 'input') {
        return super.setElementAttribute(renderElement, propertyName, propertyValue);
      }
    } else if (propertyName === 'src') {
      return super.setElementAttribute(renderElement, propertyName, propertyValue);
    }
    return super.setElementProperty(renderElement, propertyName, propertyValue);
  }

  setElementStyle(renderElement: any, styleName: string, styleValue: string): void {
    let styleNameCased = cssHyphenate(styleName);
    super.setElementStyle(renderElement, styleNameCased, styleValue);
  }

  invokeElementMethod(renderElement: any, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      if (DOM.nodeName(element) === 'input') {
        return super.invokeElementMethod(renderElement, 'autofocus', null);
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

}


