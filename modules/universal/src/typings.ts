// typescript does not allow browser/node paths for type definitions

// TODO(gdi2290): update when typescript allows package forks for universal support
export * from './browser/browser';

// bootstrap exported in both node/browser
export {
  bootstrap,
  NgPreloadCacheHttp,
  PRIME_CACHE,
  isBrowser,
  isNode
} from './browser/browser';

export * from './node/node';
