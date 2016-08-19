// dom closure
import './make_parse5_current'; // ensure Parse5DomAdapter is used

export {Inject, Optional, enableProdMode} from '@angular/core';
export function provide(token, object) {
  object.provide = token;
  return object;
}

export * from './directives/index';


export * from './http/index';

export * from './pipes/index';

export * from './platform/index';

export * from './router/index';

export * from './env';

export * from './bootloader';
export * from './helper';
export * from './ng_preboot';
export * from './render';
export * from './stringify_element';
export * from 'angular2-express-engine';
export * from 'angular2-hapi-engine';
