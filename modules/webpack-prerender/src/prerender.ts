import { platformUniversalDynamic } from 'angular2-universal';
import { PrebootOptions } from 'preboot';

declare var Zone: any;

export interface IUniversalPrerender {
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
  platformRef: any = platformUniversalDynamic();
  constructor(private _options: IUniversalPrerender) {
    if (this._options.ngModule) {
      this.platformRef.cacheModuleFactory(this._options.ngModule);
    }
  }

  apply(compiler) {
    compiler.plugin('emit', (_compilation, _callback) => {
      const zone = Zone.current.fork({
        name: 'UNIVERSAL prerender',
        properties: this._options
      });
      zone.run(() => (this.platformRef.serializeModule(this._options.ngModule, this._options))
        .then((html) => {
          if (typeof html !== 'string' || this._options.cancel) {
            return _callback(null, this._options.document);
          }
          _callback(null, html);
        })); // zone.run
    }); // compiler.plugin
  } // apply
}
