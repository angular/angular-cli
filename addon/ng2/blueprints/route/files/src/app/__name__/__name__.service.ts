import {Injectable} from 'angular2/core';

export class <%= classifiedModuleName %> {
  constructor(public id: number, public name: string) { }
}

@Injectable()
export class <%= classifiedModuleName %>Service {
  getAll() { return promise; }
  get(id: number) {
    return promise.then(all => all.find(e => e.id === id));
  }
}

let mock = [
  new <%= classifiedModuleName %>(1, 'one'),
  new <%= classifiedModuleName %>(2, 'two'),
  new <%= classifiedModuleName %>(3, 'three')
];

let promise = Promise.resolve(mock);
