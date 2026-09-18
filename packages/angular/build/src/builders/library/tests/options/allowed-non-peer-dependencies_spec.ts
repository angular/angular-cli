/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeLibraryBuilder } from '../../builder';
import { BASE_OPTIONS, LIBRARY_BUILDER_INFO, describeLibraryBuilder } from '../setup';

describeLibraryBuilder(executeLibraryBuilder, LIBRARY_BUILDER_INFO, (harness) => {
  describe('Option: "allowedNonPeerDependencies"', () => {
    it('should fail build when package.json has unallowed dependencies', async () => {
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.dependencies = {
          'lodash-es': '^4.17.21',
        };
        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
      expect(result?.error).toContain('allowedNonPeerDependencies');
      expect(result?.error).toContain('lodash-es');
    });

    it('should succeed build when dependency matches allowedNonPeerDependencies pattern', async () => {
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.dependencies = {
          'lodash-es': '^4.17.21',
        };
        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        allowedNonPeerDependencies: ['^lodash-.*'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should allow tslib by default in dependencies without configuration', async () => {
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.dependencies = {
          tslib: '^2.3.0',
        };
        return JSON.stringify(pkg, null, 2);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
