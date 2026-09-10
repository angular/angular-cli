/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isPackageUrl } from './sass-language';

describe('sass-language', () => {
  describe('isPackageUrl', () => {
    it('should identify pkg: scheme URLs as package URLs', () => {
      expect(isPackageUrl('pkg:@angular/material')).toBeTrue();
      expect(isPackageUrl('pkg:bootstrap')).toBeTrue();
      expect(isPackageUrl('pkg:@material/button/button')).toBeTrue();
    });

    it('should identify bare specifiers as package URLs', () => {
      expect(isPackageUrl('@angular/material')).toBeTrue();
      expect(isPackageUrl('@angular/material/button')).toBeTrue();
      expect(isPackageUrl('@material/button/button.scss')).toBeTrue();
      expect(isPackageUrl('bootstrap')).toBeTrue();
      expect(isPackageUrl('bootstrap/scss/bootstrap')).toBeTrue();
    });

    it('should not identify relative paths as package URLs', () => {
      expect(isPackageUrl('./styles.scss')).toBeFalse();
      expect(isPackageUrl('../shared/variables')).toBeFalse();
      expect(isPackageUrl('.hidden')).toBeFalse();
      expect(isPackageUrl('.\\styles.scss')).toBeFalse();
      expect(isPackageUrl('..\\shared\\variables')).toBeFalse();
    });

    it('should not identify absolute paths or non-pkg URLs as package URLs', () => {
      expect(isPackageUrl('/styles/theme.scss')).toBeFalse();
      expect(isPackageUrl('\\styles\\theme.scss')).toBeFalse();
      expect(isPackageUrl('file:///path/to/theme.scss')).toBeFalse();
      expect(isPackageUrl('http://example.com/styles.css')).toBeFalse();
      expect(isPackageUrl('https://example.com/styles.css')).toBeFalse();
      expect(isPackageUrl('C:\\path\\to\\theme.scss')).toBeFalse();
      expect(isPackageUrl('C:/path/to/theme.scss')).toBeFalse();
    });

    it('should not identify empty string as a package URL', () => {
      expect(isPackageUrl('')).toBeFalse();
    });
  });
});
