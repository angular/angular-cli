import {Pipe, ChangeDetectorRef} from 'angular2/core';
import {AsyncPipe} from 'angular2/common';

@Pipe({
  name: 'async',
  pure: true
})
export class NodeAsyncPipe extends AsyncPipe {
  constructor(public _ref: ChangeDetectorRef) {
    super(_ref);
  }
}
