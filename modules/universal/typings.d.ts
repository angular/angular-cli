export * from './src/browser/browser';

// fix conflict with ts
export {
  UniversalModule,
  isBrowser,
  isNode,
  platformUniversalDynamic,
  ZoneStore
} from './src/browser/browser';

export * from './src/node/node';
