import * as webpack from 'webpack';
import { basename } from 'path';
const AsyncDependenciesBlock = require('webpack/lib/AsyncDependenciesBlock');
const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');
const ImportDependency = require('webpack/lib/dependencies/ImportDependency');

// This just extends webpack.NamedChunksPlugin to prevent name collisions.
export class NamedLazyChunksWebpackPlugin extends webpack.NamedChunksPlugin {
  constructor() {
    // Append a dot and number if the name already exists.
    const nameMap = new Map<string, string>();
    function getUniqueName(baseName: string, request: string) {
      let name = baseName;
      let num = 0;
      while (nameMap.has(name) && nameMap.get(name) !== request) {
        name = `${baseName}.${num++}`;
      }
      nameMap.set(name, request);
      return name;
    }

    const nameResolver = (chunk: any) => {
      // Entry chunks have a name already, use it.
      if (chunk.name) {
        return chunk.name;
      }

      // Try to figure out if it's a lazy loaded route or import().
      if (chunk.blocks
        && chunk.blocks.length > 0
        && chunk.blocks[0] instanceof AsyncDependenciesBlock
        && chunk.blocks[0].dependencies.length === 1
        && (chunk.blocks[0].dependencies[0] instanceof ContextElementDependency
          || chunk.blocks[0].dependencies[0] instanceof ImportDependency)
      ) {
        // Create chunkname from file request, stripping ngfactory and extension.
        const request = chunk.blocks[0].dependencies[0].request;
        const chunkName = basename(request).replace(/(\.ngfactory)?\.(js|ts)$/, '');
        if (!chunkName || chunkName === '') {
          // Bail out if something went wrong with the name.
          return null;
        }
        return getUniqueName(chunkName, request);
      }

      return null;
    };

    super(nameResolver);
  }
}
