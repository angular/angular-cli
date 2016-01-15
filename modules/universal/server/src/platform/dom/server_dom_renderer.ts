import {
  isPresent,
  stringify
} from 'angular2/src/facade/lang';
import {
  provide,
  Inject,
  Injectable,
  Renderer,
  RenderViewRef,
  RenderElementRef
} from 'angular2/core';
import {
  DefaultRenderView,
} from 'angular2/src/core/render/view';

import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {
  DomRenderer,
  DomRenderer_
} from 'angular2/src/platform/dom/dom_renderer';

import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {EventManager} from 'angular2/src/platform/dom/events/event_manager';
import {DomSharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';

import {cssHyphenate} from '../../helper';

function resolveInternalDomView(viewRef: RenderViewRef): DefaultRenderView<Node> {
  return <DefaultRenderView<Node>>viewRef;
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

  setElementProperty(location: RenderElementRef, propertyName: string, propertyValue: any) {
    if (propertyName === 'value' || (propertyName === 'checked' && propertyValue !== false)) {
      let view: DefaultRenderView<Node> = resolveInternalDomView(location.renderView);
      let element = <Element>view.boundElements[(<any>location).boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.setAttribute(element, propertyName, propertyValue);
        return;
      }
    } else if (propertyName === 'src') {
      let view: DefaultRenderView<Node> = resolveInternalDomView(location.renderView);
      let element = <Element>view.boundElements[(<any>location).boundElementIndex];
      DOM.setAttribute(element, propertyName, propertyValue);
      return;
    }
    return super.setElementProperty(location, propertyName, propertyValue);
  }

  setElementStyle(location: RenderElementRef, styleName: string, styleValue: string): void {
    let styleNameCased = cssHyphenate(styleName);
    super.setElementProperty(location, styleNameCased, styleValue);
  }

  invokeElementMethod(location: RenderElementRef, methodName: string, args: any[]) {
    if (methodName === 'focus') {
      let view: DefaultRenderView<Node> = resolveInternalDomView(location.renderView);
      let element = <Element>view.boundElements[(<any>location).boundElementIndex];
      if (DOM.nodeName(element) === 'input') {
        DOM.invoke(element, 'autofocus', null);
        return;
      }

    }
    return super.invokeElementMethod(location, methodName, args);
  }

}


