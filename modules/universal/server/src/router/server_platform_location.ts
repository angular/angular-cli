import { Injectable, Inject, OpaqueToken } from 'angular2/core';
import { PlatformLocation } from 'angular2/router';
import { parse } from 'url';

export const REQUEST_URL = new OpaqueToken('requestUrl');

class Location {
  constructor(
    public pathname: string,
    public search: string,
    public hash: string
  ) {}
}

class State {
  constructor(
    public state: any,
    public title: string,
    public url: string
  ) {}
}

class PopStateEvent {
  public type = 'popstate';
  
  constructor(
    public state: any
  ) {}
}

@Injectable()
export class ServerPlatformLocation extends PlatformLocation {
  private _loc: Location;
  private _stack: Array<State> = [];
  private _stackIndex = -1;
  private _popStateListeners: Array<Function> = [];
  
  constructor(@Inject(REQUEST_URL) requestUrl: string) {
    super();
    this.pushState(null, null, requestUrl);
  }
  
  get pathname(): string { return this._loc.pathname }
  get search(): string { return this._loc.search }
  get hash(): string { return this._loc.hash }
  set pathname(newPathname: string) { this._loc.pathname = newPathname }
  
  public getBaseHrefFromDOM(): string {
    throw new Error(`
      Attempt to get base href from DOM on the server. 
      You have to provide a value for the APP_BASE_HREF token through DI.
    `);
  }
  
  public pushState(state: any, title: string, url: string): void {
    this._stack.push(new State(state, title, url));
    this._stackIndex++;
    this._updateLocation();
  }
  
  public replaceState(state: any, title: string, url: string): void {
    this._stack[this._stackIndex] = new State(state, title, url);
    this._updateLocation();
  }

  public onPopState(fn): void { this._popStateListeners.push(fn) }
  public onHashChange(fn): void {}

  public back(): void {
    if (this._stackIndex === 0) {
      return;
    }
    
    this._stackIndex--;
    this._updateLocation();
    this._callPopStateListeners();
  }
  
  public forward(): void {
    if (this._stackIndex === this._stack.length - 1) {
      return;
    }
    
    this._stackIndex++;
    this._updateLocation();
    this._callPopStateListeners();
  }
    
  private _updateLocation(): void {
    const state: State = this._stack[this._stackIndex];
    const url: string = state.url;
    
    this._setLocationByUrl(url);
  }
    
  private _setLocationByUrl(url: string): void {
    const { pathname, search, hash } = parse(url);
    
    this._loc = new Location(pathname || '', search || '', hash || '');
  }
  
  private _callPopStateListeners() {
    const state = this._stack[this._stackIndex].state;
    const event = new PopStateEvent(state);
    
    // Actually listeners should be called asynchronously,
    // But right now I don't know what is better for a server side.
    this._popStateListeners.forEach(listener => listener(event));  
  }

  _init() {}
}
