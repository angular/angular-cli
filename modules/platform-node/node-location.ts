import { Injectable, Inject, Optional } from '@angular/core';
import { PlatformLocation, APP_BASE_HREF } from '@angular/common';

import { REQUEST_URL, BASE_URL, ORIGIN_URL } from './tokens';

import * as nodeUrl from 'url';

export interface LocationConfig {
  pathname?: string;
  search?: string;
  hash?: string;
}

export interface NodeLocationConfig {
  hash?: string;
  host?: string;
  hostname?: string;
  href?: string;
  pathname?: string;
  port?: string;
  protocol?: string;
  search?: string;
}

export class NodeLocation implements LocationConfig {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  get origin(): string {
    return this.protocol + '//' + this.hostname + ':' + this.port;
  }
  constructor(config: NodeLocationConfig & LocationConfig) {
    this.assign(config);
  }
  parse(url: string) {
    return nodeUrl.parse(url);
  }
  format(obj: NodeLocationConfig): string {
    return nodeUrl.format(obj);
  }
  assign(parsed: NodeLocationConfig): this {
    this.pathname = parsed.pathname || '';
    this.search = parsed.search || '';
    this.hash = parsed.hash || '';
    this.host = parsed.host;
    this.hostname = parsed.hostname;
    this.href = parsed.href;
    this.port = parsed.port;
    this.protocol = parsed.protocol;
    return this;
  }
  toJSON(): NodeLocationConfig {
    let config: NodeLocationConfig = {
      hash: this.hash,
      host: this.host,
      hostname: this.hostname,
      href: this.href,
      pathname: this.pathname,
      port: this.port,
      protocol: this.protocol,
      search: this.search
    };
    return config;
  }

}

export class State {
  constructor(
    public state: any,
    public title: string,
    public url: string) {}

  toJSON() {
    return {
      state: this.state,
      title: this.title,
      url: this.url
    };
  }
}

export class PopStateEvent {
  public type = 'popstate';
  constructor(public state: any) {}

  toJSON() {
    return {
      state: this.state
    };
  }

}

@Injectable()
export class NodePlatformLocation extends PlatformLocation {
  private _loc: LocationConfig;
  private _stack: Array<State> = [];
  private _stackIndex = -1;
  private _popStateListeners: Array<Function> = [];
  private _baseUrl: string = '/';
  private _originUrl: string;

  constructor(
    @Optional() @Inject(ORIGIN_URL) originUrl: string,
    @Optional() @Inject(REQUEST_URL) requestUrl: string,
    @Optional() @Inject(APP_BASE_HREF) baseUrl?: string) {
    super();
    this._originUrl = originUrl;
    this._baseUrl = baseUrl || '/';
    // this.pushState(null, null, joinWithSlash(this._baseUrl, requestUrl));
    this.pushState(null, null, requestUrl);
  }
  updateUrl(originUrl, baseUrl = '/') {
    this._originUrl = originUrl;
    this._baseUrl = baseUrl || '/';
  }

  get search(): string { return this._loc.search; }
  get hash(): string { return this._loc.hash; }
  get pathname(): string { return this._loc.pathname; }
  set pathname(newPathname: string) { this._loc.pathname = newPathname; }

  getBaseHrefFromDOM(): string {
    throw new Error(`
      Attempt to get base href from DOM on the server.
      You have to provide a value for the APP_BASE_HREF token through DI.
    `);
  }

  getBaseHref(): string { return this._baseUrl; }

  path(): string { return this._loc.pathname; }

  pushState(state: any, title: string, url: string): void {
    this._stack.push(new State(state, title, url));
    this._stackIndex++;
    this._updateLocation();
  }

  replaceState(state: any, title: string, url: string): void {
    this._stack[this._stackIndex] = new State(state, title, url);
    this._updateLocation();
  }

  onPopState(fn): void { this._popStateListeners.push(fn); }
  onHashChange(fn): void { /*TODO*/}

  back(): void {
    if (this._stackIndex === 0) {
      return;
    }

    this._stackIndex--;
    this._updateLocation();
    this._callPopStateListeners();
  }

  forward(): void {
    if (this._stackIndex === this._stack.length - 1) {
      return;
    }

    this._stackIndex++;
    this._updateLocation();
    this._callPopStateListeners();
  }

  prepareExternalUrl(internal: string): string {
    return joinWithSlash(this._baseUrl, internal);
  }

  toJSON(): any {
    return {
      location: this._loc,
      stack: this._stack,
      stackIndex: this._stackIndex,
      popStateListeners: this._popStateListeners,
      baseHref: this._baseUrl
    };
  }

  private _updateLocation(): void {
    const state: State = this._stack[this._stackIndex];
    const url: string = state.url;

    this._setLocationByUrl(url);
  }

  private _setLocationByUrl(url: string): void {
    const resolvedOriginBase = nodeUrl.resolve(this._originUrl, this._baseUrl);
    const resolvedWithUrl = nodeUrl.resolve(resolvedOriginBase, url);
    const nodeLocation: NodeLocationConfig = nodeUrl.parse(resolvedWithUrl);
    this._loc = new NodeLocation(nodeLocation);
  }

  private _callPopStateListeners() {
    const state = this._stack[this._stackIndex].state;
    const event = new PopStateEvent(state);

    // Actually listeners should be called asynchronously,
    // But right now I don't know what is better for a server side.
    this._popStateListeners.forEach(listener => listener(event));
  }
}

// @internal
export function joinWithSlash(start: string, end: string): string {
  if (start.length === 0) {
    return end;
  }
  if (end.length === 0) {
    return start;
  }
  var slashes = 0;
  if ((<any>start).endsWith('/')) {
    slashes++;
  }
  if ((<any>end).startsWith('/')) {
    slashes++;
  }
  if (slashes === 2) {
    return start + end.substring(1);
  }
  if (slashes === 1) {
    return start + end;
  }
  return start + '/' + end;
}

export const NODE_LOCATION_PROVIDERS: Array<any> = [
  // NodePlatformLocation,
  { provide: PlatformLocation, useClass: NodePlatformLocation }
];
