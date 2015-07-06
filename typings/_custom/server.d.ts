declare var require: any;
declare var __filename: string;
declare var __dirname: string;
declare var global: any;

declare module 'fs' {
  function readFile(filePath: string, callback: Function): any
}

declare module "dom_renderer" {
  class IsoDomRenderer {
    _moveViewNodesIntoParent(): any;
    _createGlobalEventListener(): any;
    _createEventListener(): any;
  }
}

declare module "angular2_server" {
  function bootstrap(appComponentType: any, appInjector: any, componentInjectableBindings?: Array<any>, errorReporter?: Function): any;
}
