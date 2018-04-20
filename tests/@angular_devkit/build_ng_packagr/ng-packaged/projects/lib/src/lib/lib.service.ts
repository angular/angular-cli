import { Injectable } from '@angular/core';

@Injectable()
export class LibService {

  constructor() { }

  testEs2016() {
    return ['foo', 'bar'].includes('foo');
  }

}
