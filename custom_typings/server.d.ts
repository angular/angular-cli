
declare module "xhr2" {
  class XMLHttpRequest {
    nodejsSet(url: any): any;
  }
  export = XMLHttpRequest;
}

declare module "angular2_server" {
  function bootstrap(appComponentType: any, appInjector: any, componentInjectableBindings?: Array<any>, errorReporter?: Function): any;
}
