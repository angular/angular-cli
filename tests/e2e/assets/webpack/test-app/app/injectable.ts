import {Injectable, Inject, ViewContainerRef} from '@angular/core';
import {DOCUMENT} from '@angular/platform-browser';


@Injectable()
export class MyInjectable {
  constructor(public viewContainer: ViewContainerRef, @Inject(DOCUMENT) public doc) {}
}
