import * as webpack from 'webpack';
import { basename } from 'path';
const AsyncDependenciesBlock = require('webpack/lib/AsyncDependenciesBlock');
const ContextElementDependency = require('webpack/lib/dependencies/ContextElementDependency');
const ImportDependency = require('webpack/lib/dependencies/ImportDependency');

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

      // Try to figure out if it's a lazy loaded route or import().
      if (chunk.blocks
        && chunk.blocks.length > 0
        && chunk.blocks[0] instanceof AsyncDependenciesBlock
        && chunk.blocks[0].dependencies.length === 1
        && (chunk.blocks[0].dependencies[0] instanceof ContextElementDependency
          || chunk.blocks[0].dependencies[0] instanceof ImportDependency)
      ) {
        // Create chunkname from file request, stripping ngfactory and extension.
        const req = chunk.blocks[0].dependencies[0].request;
        const chunkName = basename(req).replace(/(\.ngfactory)?\.(js|ts)$/, '');
        if (!chunkName || chunkName === '') {
          // Bail out if something went wrong with the name.
          return null;
        }
        return getUniqueName(chunkName);
      }

      return null;
    };

    super(nameResolver);
  }
}
