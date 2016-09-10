export * from './src/browser';
export * from './src/node';

// fix conflict with ts
export {
  UniversalModule,
  isBrowser,
  isNode,
  platformUniversalDynamic
} from './src/node';
