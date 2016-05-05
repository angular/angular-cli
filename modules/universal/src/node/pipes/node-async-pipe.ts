import {Pipe, ChangeDetectorRef} from '@angular/core';
import {AsyncPipe} from '@angular/common';

@Pipe({
  name: 'async',
  pure: true
})
export class NodeAsyncPipe extends AsyncPipe {
  constructor(public _ref: ChangeDetectorRef) {
    super(_ref);
  }
}
