/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule, SchematicsException } from '@angular-devkit/schematics';

import { generateFromFiles } from '../utility/generate-from-files';

import { Implement as GuardInterface, Schema as GuardOptions } from './schema';

export default function (options: GuardOptions): Rule {
  if (!options.implements) {
    throw new SchematicsException('Option "implements" is required.');
  }
  if (options.implements.length > 1 && options.functional) {
    throw new SchematicsException(
      'Can only specify one value for implements when generating a functional guard.',
    );
  }

  if (options.functional) {
    const guardType = options.implements[0] + 'Fn';

    return generateFromFiles({ ...options, templateFilesDirectory: './type-files' }, { guardType });
  } else {
    const implementations = options.implements
      .map((implement) => (implement === 'CanDeactivate' ? 'CanDeactivate<unknown>' : implement))
      .join(', ');
    const commonRouterNameImports = ['ActivatedRouteSnapshot', 'RouterStateSnapshot'];
    const routerNamedImports: string[] = [...options.implements, 'MaybeAsync', 'GuardResult'];

    if (options.implements.includes(GuardInterface.CanMatch)) {
      routerNamedImports.push('Route', 'subPath');

      if (options.implements.length > 1) {
        routerNamedImports.push(...commonRouterNameImports);
      }
    } else {
      routerNamedImports.push(...commonRouterNameImports);
    }

    routerNamedImports.sort();

    const routerImports = routerNamedImports.join(', ');

    return generateFromFiles(
      { ...options, templateFilesDirectory: './implements-files' },
      {
        implementations,
        routerImports,
      },
    );
  }
}
