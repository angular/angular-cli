import {
  provide,
  Inject,
  Injectable
} from 'angular2/angular2';

import {
  Renderer,
  DomRenderer,
  DomRenderer_,
  DOCUMENT,
  RenderElementRef
} from 'angular2/src/core/render/render';
import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {EventManager} from 'angular2/src/core/render/dom/events/event_manager';
import {DomSharedStylesHost} from 'angular2/src/core/render/dom/shared_styles_host';
import {DOM} from 'angular2/src/core/dom/dom_adapter';

function resolveInternalDomView(viewRef) {
  return viewRef;
}

//function resolveInternalDomFragment(fragmentRef) {
//  return fragmentRef.nodes;
//}

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
      let view = resolveInternalDomView(location.renderView);
      let element = view.boundElements[location.boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.setAttribute(element, propertyName, propertyValue);
        return;
      }
    } else if (propertyName === 'src') {
      let view = resolveInternalDomView(location.renderView);
      let element = view.boundElements[location.boundElementIndex];
      DOM.setAttribute(element, propertyName, propertyValue);
      return;
    }
    return super.setElementProperty(location, propertyName, propertyValue);
  }

  invokeElementMethod(location: RenderElementRef, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      let view = resolveInternalDomView(location.renderView);
      let element = view.boundElements[location.boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.invoke(element, 'autofocus', null);
        return;
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

}


export const SERVER_DOM_RENDERER_PROVIDERS = [
  provide(DomRenderer, {useClass: ServerDomRenderer_}),
  provide(Renderer, {useClass: DomRenderer})
];

