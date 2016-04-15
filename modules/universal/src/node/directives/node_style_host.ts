import {Directive, ElementRef} from 'angular2/core';
import {DomSharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';


@Directive({
  selector: 'ng-style-host'
})
export class NodeStyleHost {
  constructor(
    public el: ElementRef,
    public domSharedStylesHost: DomSharedStylesHost) {
    domSharedStylesHost.addHost(el.nativeElement);
  }
}
