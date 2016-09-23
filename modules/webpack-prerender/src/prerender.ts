import { platformUniversalDynamic } from 'angular2-universal';
import { PrebootOptions } from 'preboot';

declare var Zone: any;

export interface IUniversalPrerender {
  documentPath?: string;
  document?: string;
  DOCUMENT?: string;
  cancelHandler?: () => boolean;
  CANCEL_HANDLER?: () => boolean;
  req?: any;
  REQ?: any;
  res?: any;
  RES?: any;
  time?: boolean;
  TIME?: boolean;
  id?: string;
  ID?: string;
  ngModule?: any;
  precompile?: boolean;
  preboot?: PrebootOptions;
  cancel?: boolean;
  CANCEL?: boolean;
  requestUrl?: string;
  REQUEST_URL?: string;
  originUrl?: string;
  ORIGIN_URL?: string;
  baseUrl?: string;
  BASE_URL?: string;
  cookie?: string;
  COOKIE?: string;
}

export class UniversalPrerender {
  platformRef: any;
  constructor(private _options: IUniversalPrerender) {
    // if (this._options.ngModule) {
    //   this.platformRef.cacheModuleFactory(this._options.ngModule);
    // }
  }

  apply(compiler) {
    compiler.plugin('emit', (_compilation, _callback) => {
      this.platformRef = this.platformRef || platformUniversalDynamic();
      this._options.document = this._options.document || _compilation.assets[this._options.documentPath].source();
      const zone = Zone.current.fork({
        name: 'UNIVERSAL prerender',
        properties: this._options
      });
      zone.run(() => (this.platformRef.serializeModule(this._options.ngModule, this._options))
        .then((html) => {
          if (typeof html !== 'string' || this._options.cancel) {
            _compilation.assets[this._options.documentPath] = {
              source: () => this._options.document,
              size: () => this._options.document.length
            };
            return _callback();
          }
          _compilation.assets[this._options.documentPath] = {
            source: () => html,
            size: () => html.length
          };
          return _callback();
        })); // zone.run
    }); // compiler.plugin
  } // apply
}
