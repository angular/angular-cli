/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

const fs = require('fs');
const path = require('path');

const pkg = path.join('packages', 'schematics', 'angular');
describe('@schematics/angular javascript code', () => {
  fs.readdirSync(pkg).forEach(d => {
    const dir = path.join(pkg, d);
    if (!fs.statSync(dir).isDirectory()) return;

    it(`${d} has no typescript dependency`, () => {
      function check(subdir) {
        fs.readdirSync(subdir).forEach(f => {
          const file = path.join(subdir, f);
          if (fs.statSync(file).isDirectory()) {
            check(file);
          } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(file, { encoding: 'utf-8' });
            if (content.indexOf('require("typescript")') >= 0) {
              fail(`${file} has a typescript require`);
            }
          }
        });
      }
      check(dir);
    });
  });
});
