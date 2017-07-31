import * as webpack from 'webpack';

declare module 'webpack' {
  export class NamedChunksPlugin {
    constructor(nameResolver: (chunk: any) => string | null);
  }
  export class HashedModuleIdsPlugin {
    constructor();
  }
  namespace optimize {
    export class ModuleConcatenationPlugin {
      constructor();
    }
  }
}
