import * as nodeUrl from 'url';
import {Injectable, Inject, provide, Optional} from 'angular2/core';
import {LocationStrategy, APP_BASE_HREF} from 'angular2/router';
import {MockLocationStrategy} from 'angular2/src/mock/mock_location_strategy';
import {isBlank} from 'angular2/src/facade/lang';
import {BASE_URL} from '../http/server_http';

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
  assign(url: string): void {
    var parsed = nodeUrl.parse(url);
    this.hash = parsed.hash;
    this.host = parsed.host;
    this.hostname = parsed.hostname;
    this.href = parsed.href;
    this.pathname = parsed.pathname;
    this.port = parsed.port;
    this.protocol = parsed.protocol;
    this.search = parsed.search;
    this.origin = parsed.protocol + '//' + parsed.hostname + ':' + parsed.port;
  }
  reload(forcedReload?: boolean): void {/*TODO*/}
  replace(url: string): void {
    this.assign(url);
  }
  toString(): string { /*TODO*/ return ''; }
}


@Injectable()
export class ServerLocationStrategy extends LocationStrategy {
  private _location: Location = new MockServerLocation();
  private _history:  History = new MockServerHistory();
  private _baseHref: string = '/';

  constructor(
    @Optional() @Inject(BASE_URL) url?: string,
    @Optional() @Inject(APP_BASE_HREF) baseUrl?: string) {
    super();
    if (isBlank(baseUrl)) {
      throw new Error(
          `No base href set. Please provide a value for the APP_BASE_HREF token or add a base element to the document.`);
    }
    this._baseHref = baseUrl;
    this._location.assign(url || '/');
  }

  onPopState(fn: EventListener): void {/*TODO*/}

  getBaseHref(): string { return this._baseHref; }

  path(): string { return this._location.pathname; }

  pushState(state: any, title: string, url: string) {/*TODO*/}

  replaceState(state: any, title: string, url: string) {/*TODO*/}

  forward(): void {
    this._history.forward();
  }

  back(): void {
    this._history.back();
  }

  prepareExternalUrl(internal: string): string {
    return joinWithSlash(this._baseHref, internal);
  }
}

export const SERVER_LOCATION_PROVIDERS: Array<any> = [
  provide(LocationStrategy, {useClass: ServerLocationStrategy})
];

export function joinWithSlash(start: string, end: string): string {
  if (start.length == 0) {
    return end;
  }
  if (end.length == 0) {
    return start;
  }
  var slashes = 0;
  if (start.endsWith('/')) {
    slashes++;
  }
  if (end.startsWith('/')) {
    slashes++;
  }
  if (slashes == 2) {
    return start + end.substring(1);
  }
  if (slashes == 1) {
    return start + end;
  }
  return start + '/' + end;
}
