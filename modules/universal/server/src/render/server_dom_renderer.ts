import {
  provide,
  Inject,
  Injectable,
  Renderer,
  RenderElementRef
} from 'angular2/core';

import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {
  DomRenderer,
  DomRenderer_
} from 'angular2/src/platform/dom/dom_renderer';

import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {EventManager} from 'angular2/src/platform/dom/events/event_manager';
import {DomSharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';

export {
  DOCUMENT,
  DomRenderer,
  DomRenderer_
};

@Injectable()
export class ServerDomRenderer_ extends DomRenderer_ {
  constructor(
    private eventManager: EventManager,
    private domSharedStylesHost: DomSharedStylesHost,
    private animate: AnimationBuilder,
    @Inject(DOCUMENT) document) {
     super(eventManager, domSharedStylesHost, animate, document);
  }

  setElementProperty(location: RenderElementRef, propertyName: string, propertyValue: any) {
    if (propertyName === 'value' || (propertyName === 'checked' && propertyValue !== false)) {
      let view = location.renderView;
      let element = view.boundElements[location.boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.setAttribute(element, propertyName, propertyValue);
        return;
      }
    } else if (propertyName === 'src') {
      let view = location.renderView;
      let element = view.boundElements[location.boundElementIndex];
      DOM.setAttribute(element, propertyName, propertyValue);
      return;
    }
    return super.setElementProperty(location, propertyName, propertyValue);
  }

  invokeElementMethod(location: RenderElementRef, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      let view = location.renderView;
      let element = view.boundElements[location.boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.invoke(element, 'autofocus', null);
        return;
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

}


