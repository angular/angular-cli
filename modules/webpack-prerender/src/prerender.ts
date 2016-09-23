// import { platformUniversalDynamic } from 'angular2-universal';
// import { PrebootOptions } from 'preboot';

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
  platformRef = platformUniversalDynamic();
  constructor(private _options: IWebpackPrerender) {
    if (_options.ngModule) {
      this.platformRef.cacheModuleFactory(_options.ngModule);
    }
  }

  apply(compiler) {
    compiler.plugin('emit', (_compilation, _callback) => {
      const zone = Zone.current.fork({
        name: 'UNIVERSAL prerender',
        properties: this._options
      });
      return zone.run(() => (_options.precompile ?
        platformRef.serializeModule(_options.ngModule, _options) :
        platformRef.serializeModuleFactory(_options.ngModule, _options)
      )
        .then(html => {
          if (typeof html !== 'string' || cancel) {
            return done(null, _options.document);
          }
          done(null, html);
        })
        .catch(e => {
          console.log(e.stack);
          // if server fail then return client html
          done(null, _options.document);
        });
    });
  }
}
