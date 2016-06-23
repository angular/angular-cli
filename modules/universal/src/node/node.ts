// dom closure
import {Parse5DomAdapter} from '@angular/platform-server/src/parse5_adapter';
Parse5DomAdapter.makeCurrent();

export {provide, Inject, Optional, enableProdMode} from '@angular/core';

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
