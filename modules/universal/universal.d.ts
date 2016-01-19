export function provide(token: any, config: any): any;
export class NodeXhr {
  build(): any;
}
export class NodeBackend {
  createConnection(request: any): any;
}
export function bootstrap(component: any, providers?: any): any;
export function prebootComplete(value?: any): any;
export function renderToString(AppComponent: any, serverProviders?: any): Promise<string>;
export function renderToStringWithPreboot(
  AppComponent: any,
  serverProviders?: any,
  prebootConfig?: any): Promise<string>;
export function appRefSyncRender(appRef: any): string;
export function serializeApplication(element: any, styles: string[], cache?: any): string;
export function selectorResolver(componentType: any): string;
export function stringifyElement(el: any): string;
export var SERVER_LOCATION_PROVIDERS: [any];
export var BASE_URL: string;
export function buildBaseUrl(url: string, existing?: boolean): any;
export var HTTP_PROVIDERS: [any];
export var NODE_PROVIDERS: [any];
export function buildNodeAppProviders(appComponentType: any, providers?: Array<any>): Array<any>;
export function buildNodePlatformProviders(
  appComponentType: any,
  providers?: Array<any>): Array<any>;
export var NODE_APPLICATION_COMMON_PROVIDERS: [any];
export var NODE_APPLICATION_PROVIDERS: [any];

export default {
  provide,
  NodeXhr,
  NodeBackend,
  bootstrap,
  prebootComplete,
  renderToString,
  renderToStringWithPreboot,
  appRefSyncRender,
  serializeApplication,
  selectorResolver,
  stringifyElement,
  SERVER_LOCATION_PROVIDERS,
  BASE_URL,
  buildBaseUrl,
  HTTP_PROVIDERS,
  buildNodeAppProviders,
  buildNodePlatformProviders,
  NODE_PROVIDERS,
  NODE_APPLICATION_COMMON_PROVIDERS,
  NODE_APPLICATION_PROVIDERS
}
