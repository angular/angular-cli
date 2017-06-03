import {ExportStringRef} from './export-ref';
import {FileSystemEngineHostBase} from './file-system-engine-host-base';
import {RuleFactory} from '../src/engine/interface';

import {join} from 'path';


/**
 * A simple EngineHost that uses NodeModules to resolve collections.
 */
export class NodeModulesEngineHost extends FileSystemEngineHostBase {
  protected _resolveCollectionPath(name: string): string | null {
    const pkgJsonSchematics = require(join(name, 'package.json'))['schematics'];
    if (!pkgJsonSchematics) {
      return null;
    }

    return require.resolve(join(name, pkgJsonSchematics));
  }

  protected _resolveReferenceString(refString: string, parentPath: string) {
    const ref = new ExportStringRef<RuleFactory<any>>(refString, parentPath);
    return { ref: ref.ref, path: ref.module };
  }
}
