/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext, createBuilder } from '@angular-devkit/architect';
import { Schema as ProtractorBuilderOptions } from '../protractor/schema';

export default createBuilder<ProtractorBuilderOptions>(
  (_options: ProtractorBuilderOptions, context: BuilderContext) => {
    context.logger.error(
      'Protractor has reached end-of-life and is no longer supported. For additional information and alternatives, please see https://blog.angular.dev/protractor-deprecation-update-august-2023-2beac7402ce0.',
    );

    return { success: false };
  },
);
