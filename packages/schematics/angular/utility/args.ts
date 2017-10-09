/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { dasherize } from '../strings';


// tslint:disable-next-line:no-any
export function parseOptions(schematicName: string, commandOptions: any) {
  const {
    _,
    _angularCliConfig: cliConfig,
    _angularCliAppConfig: appConfig,
    _angularCliParsedPath: parsedPath,
  } = commandOptions;

  // If name is passed in, just ignore it. It's either backward compatible or being called by
  // another schematic.
  if (commandOptions.name) {
    return;
  }

  commandOptions.name = dasherize(_[0].split(/[\\/]/g).pop());
  commandOptions.sourceDir = appConfig.root;

  const root = appConfig.root + '/';
  commandOptions.appRoot = parsedPath.appRoot === appConfig.root ? '' :
    parsedPath.appRoot.startsWith(root)
      ? parsedPath.appRoot.substr(root.length)
      : parsedPath.appRoot;

  commandOptions.path = parsedPath.dir;
  commandOptions.path = parsedPath.dir === appConfig.root ? '' :
    parsedPath.dir.startsWith(root)
      ? commandOptions.path.substr(root.length)
      : commandOptions.path;
  if (['component', 'directive'].indexOf(schematicName) !== -1) {
    const root = commandOptions.$$originalRoot ? commandOptions.$$originalRoot() : commandOptions;
    if (root.prefix === undefined) {
      commandOptions.prefix = appConfig.prefix;
    }

    if (schematicName === 'component') {
      if (root.styleext === undefined) {
        commandOptions.styleext = cliConfig.defaults && cliConfig.defaults.styleExt;
      }
    }
  }

  if (schematicName === 'interface' && _[1]) {
    commandOptions.type = _[1];
  }
}
