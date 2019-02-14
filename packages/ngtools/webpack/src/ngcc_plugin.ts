/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ResolvePlugin } from 'webpack';

interface NgccPluginOptions {
  mainFields: string[];
}

export class NgccPlugin implements ResolvePlugin {
  constructor(private options: NgccPluginOptions) { }

  apply(resolver: any) {
    resolver.getHook('before-existing-directory')
      .tapAsync('NgccPlugin', (request: any, resolveContext: any, callback: any) => {
        // Only process packages.
        if (request.path !== request.descriptionFileRoot) { return callback(); }

        const packageJson = request.descriptionFileData;

        // Skip this package if it has already been processed by Ngcc.
        if (packageJson.checkedByNgcc === true) { return callback(); }

        const entry = this.options.mainFields.find(mf => typeof packageJson[mf] === 'string');

        // do ngcc stuff over the entry point

        // load changed packageJson from request.descriptionFilePath
        packageJson.checkedByNgcc = true;

        console.log('###')
        console.log('path', request.path)
        console.log('entry', entry)

        return callback();
      });
  }
}
