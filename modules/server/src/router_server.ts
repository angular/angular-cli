/// <reference path="../typings/tsd.d.ts" />

import {Injectable, bind} from 'angular2/di';
import {LocationStrategy} from 'angular2/router';
import {MockLocationStrategy} from 'angular2/src/mock/mock_location_strategy';

// TODO: see https://github.com/angular/universal/issues/60#issuecomment-130463593
class MockServerHistory implements History {
  length: number;
  state: any;
  constructor () {/*TODO*/}
  back(distance?: any): void {/*TODO*/}
  forward(distance?: any): void {/*TODO*/}
  go(delta?: any): void {/*TODO*/}
  pushState(statedata: any, title?: string, url?: string): void {/*TODO*/}
  replaceState(statedata: any, title?: string, url?: string): void {/*TODO*/}
}

class MockServerLocation implements Location {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  origin: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  constructor () {/*TODO*/}
  assign(url: string): void {/*TODO*/}
  reload(forcedReload?: boolean): void {/*TODO*/}
  replace(url: string): void {/*TODO*/}
  toString(): string { /*TODO*/ return ''; }
}


@Injectable()
export class ServerLocationStrategy extends LocationStrategy {
  private _location: Location = new MockServerLocation();
  private _history: History = new MockServerHistory();
  private _baseHref: string = '/';

  constructor() { super(); }

  onPopState(fn: EventListener): void {/*TODO*/}

  getBaseHref(): string { return this._baseHref; }

  path(): string { return this._location.pathname; }

  pushState(state: any, title: string, url: string) {/*TODO*/}

  forward(): void {
    this._history.forward();
  }

  back(): void {
    this._history.back();
  }
}

export const SERVER_LOCATION_BINDINGS: Array<any> = [
  bind(LocationStrategy).toClass(ServerLocationStrategy)
];
