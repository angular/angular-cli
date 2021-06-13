/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // This test ensures that ng e2e serves the HTTP headers that are configured
  // in the 'headers' field of the serve options. We do this by serving the
  // strictest possible CSP headers (default-src 'none') which blocks loading of
  // any resources (including scripts, styles and images) and should cause ng
  // e2e to fail with a CSP-related error, which is asserted below.

  await updateJsonFile('angular.json', (json) => {
    const serve = json['projects']['test-project']['architect']['serve'];
    if (!serve['options']) serve['options'] = {};
    serve['options']['headers'] = {
      'Content-Security-Policy': "default-src 'none'",
    };
  });

  let errorMessage = null;
  try {
    await ng('e2e');
  } catch (error) {
    errorMessage = error.message;
  }

  if (!errorMessage) {
    throw new Error(
      'Application loaded successfully, indicating that the CSP headers were not served.',
    );
  }
  if (!errorMessage.match(/Refused to load/)) {
    throw new Error('Expected to see CSP loading failure in error logs.');
  }
}
