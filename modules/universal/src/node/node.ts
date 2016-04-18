// dom closure
import {Parse5DomAdapter} from 'angular2/src/platform/server/parse5_adapter';
Parse5DomAdapter.makeCurrent();

export {provide, Inject, Optional} from 'angular2/core';

export * from './directives/index';

export * from './http/index';

export * from './pipes/index';

export * from './platform/index';

export * from './router/index';

export * from './bootloader';
export * from './helper';
export * from './ng_preboot';
export * from './render';
export * from './stringify_element';
export * from 'angular2-express-engine';
export * from 'angular2-hapi-engine';
