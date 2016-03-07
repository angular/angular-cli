
declare module "xhr2" {
  export class XMLHttpRequest {
    nodejsSet(url: any): any;
  }
}

declare module NodeJS  {
  interface Global {
    window: any | Window;
  }
}
