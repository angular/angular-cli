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

interface RenderView {
  boundElements;
}

@Injectable()
export class ServerDomRenderer_ extends DomRenderer_ {
  constructor(
    private eventManager: EventManager,
    private domSharedStylesHost: DomSharedStylesHost,
    private animate: AnimationBuilder,
    @Inject(DOCUMENT) document) {
     super(eventManager, domSharedStylesHost, animate, document);
  }

  setElementProperty(location: RenderElementRef | any, propertyName: string, propertyValue: any) {
    if (propertyName === 'value' || (propertyName === 'checked' && propertyValue !== false)) {
      let view: RenderView = location.renderView;
      let element = view.boundElements[location.boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.setAttribute(element, propertyName, propertyValue);
        return;
      }
    } else if (propertyName === 'src') {
      let view: RenderView = location.renderView;
      let element = view.boundElements[location.boundElementIndex];
      DOM.setAttribute(element, propertyName, propertyValue);
      return;
    }
    return super.setElementProperty(location, propertyName, propertyValue);
  }

  invokeElementMethod(location: RenderElementRef | any, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      let view: RenderView = location.renderView;
      let element = view.boundElements[location.boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.invoke(element, 'autofocus', null);
        return;
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

}


