/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuildBrowserFeatures } from '../build-browser-features';
import { NormalizeOptimizationOptions } from '../normalize-optimization';
import { InlineFontsProcessor } from './inline-fonts';
import { IndexHtmlTransform } from './write-index-html';

export function getHtmlTransforms(
  optimization: NormalizeOptimizationOptions,
  buildBrowserFeatures: BuildBrowserFeatures,
  extraHtmlTransform?: IndexHtmlTransform,
): IndexHtmlTransform[] {
  const indexTransforms: IndexHtmlTransform[] = [];
  const { fonts, styles } = optimization;

  // Inline fonts
  if (fonts.inline) {
    const inlineFontsProcessor = new InlineFontsProcessor({
      minifyInlinedCSS: styles,
      WOFFSupportNeeded: !buildBrowserFeatures.isFeatureSupported('woff2'),
    });

    indexTransforms.push(content => inlineFontsProcessor.process(content));
  }

  if (extraHtmlTransform) {
    indexTransforms.push(extraHtmlTransform);
  }

  return indexTransforms;
}

