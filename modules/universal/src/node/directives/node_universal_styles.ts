import {Directive, ElementRef} from '@angular/core';
import {DomSharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';


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
