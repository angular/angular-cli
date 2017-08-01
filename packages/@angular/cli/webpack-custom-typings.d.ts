import * as webpack from 'webpack';

declare module 'webpack' {
  export class NamedChunksPlugin {
    constructor(nameResolver: (chunk: any) => string | null);
  }
  export class HashedModuleIdsPlugin {
    constructor();
  }
}
