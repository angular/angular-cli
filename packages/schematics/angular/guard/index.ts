/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, SchematicsException } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { Implement as GuardInterface, Schema as GuardOptions } from './schema';

export default function (options: GuardOptions): Rule {
  if (!options.implements) {
    throw new SchematicsException('Option "implements" is required.');
  }

  const implementations = options.implements
    .map((implement) => (implement === 'CanDeactivate' ? 'CanDeactivate<unknown>' : implement))
    .join(', ');
  const commonRouterNameImports = ['ActivatedRouteSnapshot', 'RouterStateSnapshot'];
  const routerNamedImports: string[] = [...options.implements, 'UrlTree'];

  if (options.implements.includes(GuardInterface.CanLoad)) {
    routerNamedImports.push('Route', 'UrlSegment');

    if (options.implements.length > 1) {
      routerNamedImports.push(...commonRouterNameImports);
    }
  } else {
    routerNamedImports.push(...commonRouterNameImports);
  }

  routerNamedImports.sort();

  const implementationImports = routerNamedImports.join(', ');

  return generateFromFiles(options, {
    implementations,
    implementationImports,
  });
}
