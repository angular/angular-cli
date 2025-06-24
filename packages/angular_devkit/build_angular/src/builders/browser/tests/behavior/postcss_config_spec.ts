/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Postcss config file"', () => {
    it('applies plugins from config file if one is present', async () => {
      // See:
      // https://github.com/postcss/postcss-plugin-boilerplate/blob/main/template/index.t.js
      await harness.writeFile(
        'node_modules/my-postcss-plugin/index.cjs',
        `module.exports = (opts = {}) => {
  return {
    postcssPlugin: 'my-postcss-plugin',

    Root(root, postcss) {
      const newRule = new postcss.Rule({
        selector: '.my-postcss-plugin::before',
      });
      newRule.append({ text: 'content: "from applied plugin";' });
      root.append(newRule);
    },
  };
};

module.exports.postcss = true;
`,
      );

      await harness.writeFile(
        'postcss.config.json',
        JSON.stringify({
          plugins: {
            'my-postcss-plugin/index.cjs': {},
          },
        }),
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/styles.css').content.toMatch(/from applied plugin/);
    });
  });
});
