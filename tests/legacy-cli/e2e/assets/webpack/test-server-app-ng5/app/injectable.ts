import {Injectable, Inject, ViewContainerRef} from '@angular/core';
import {DOCUMENT} from '@angular/platform-browser';


@Injectable()
export class MyInjectable {
  constructor(@Inject(DOCUMENT) public doc) {}
}
