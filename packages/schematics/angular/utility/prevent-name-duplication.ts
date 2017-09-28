/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { camelize } from '../strings';
export default function(name: string, suffix: string): string {
  const camelizedName = camelize(name);
  if (camelizedName.toLowerCase().endsWith(suffix.toLowerCase())) {
    return camelizedName.substring(0, camelizedName.length - suffix.length);
  }

  return name;
}
