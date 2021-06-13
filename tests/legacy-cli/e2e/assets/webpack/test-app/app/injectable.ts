import {Injectable, Inject, ViewContainerRef} from '@angular/core';
import {DOCUMENT} from '@angular/common';


@Injectable()
export class MyInjectable {
  constructor(public viewContainer: ViewContainerRef, @Inject(DOCUMENT) public doc) {}
}
