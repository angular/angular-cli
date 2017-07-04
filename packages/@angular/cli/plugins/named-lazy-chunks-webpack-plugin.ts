import * as webpack from 'webpack';


// This just extends webpack.NamedChunksPlugin to prevent name collisions.
export class NamedLazyChunksWebpackPlugin extends webpack.NamedChunksPlugin {
  constructor() {
    // Append a dot and number if the name already exists.
    const nameMap = new Map<string, boolean>();
    function getUniqueName(baseName: string) {
      let name = baseName;
      let num = 0;
      while (nameMap.has(name)) {
        name = `${baseName}.${num++}`;
      }
      nameMap.set(name, true);
      return name;
    }

    const nameResolver = (chunk: any) => {
      // Entry chunks have a name already, use it.
      if (chunk.name) {
        return chunk.name;
      }

      // Try to figure out if it's a lazy loaded route.
      if (chunk.blocks
        && chunk.blocks.length > 0
        && chunk.blocks[0].dependencies
        && chunk.blocks[0].dependencies.length > 0
        && chunk.blocks[0].dependencies[0].lazyRouteChunkName
      ) {
        // lazyRouteChunkName was added by @ngtools/webpack.
        return getUniqueName(chunk.blocks[0].dependencies[0].lazyRouteChunkName);
      }

      return null;
    };

    super(nameResolver);
  }
}
