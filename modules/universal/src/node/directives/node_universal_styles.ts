import {Directive, ElementRef} from 'angular2/core';
import {DomSharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';


@Directive({
  selector: 'universal-styles'
})
export class NodeUniversalStyles {
  constructor(
    public el: ElementRef,
    public domSharedStylesHost: DomSharedStylesHost) {
    domSharedStylesHost.addHost(el.nativeElement);
  }
}
