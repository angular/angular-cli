export * from './github.routes';
export * from './github';
import {APP_SERVICES} from './services';
import {APP_ROUTER_PROVIDERS} from './github.routes';

export const APP_PROVIDERS = [
  ...APP_ROUTER_PROVIDERS,
  ...APP_SERVICES
];

