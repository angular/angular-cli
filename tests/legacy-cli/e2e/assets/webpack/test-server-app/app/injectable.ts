import {Injectable, Inject} from '@angular/core';
import {DOCUMENT} from '@angular/common';


@Injectable()
export class MyInjectable {
  constructor(@Inject(DOCUMENT) public doc) {}
}
