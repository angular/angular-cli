/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { declareTool } from './tool-registry';

export const BEST_PRACTICES_TOOL = declareTool({
  name: 'get_best_practices',
  title: 'Get Angular Coding Best Practices Guide',
  description: `
<Purpose>
Retrieves the official Angular Best Practices Guide. This guide contains the essential rules and conventions
that **MUST** be followed for any task involving the creation, analysis, or modification of Angular code.
</Purpose>
<Use Cases>
* As a mandatory first step before writing or modifying any Angular code to ensure adherence to modern standards.
* To learn about key concepts like standalone components, typed forms, and modern control flow syntax (@if, @for, @switch).
* To verify that existing code aligns with current Angular conventions before making changes.
</Use Cases>
<Operational Notes>
* The content of this guide is non-negotiable and reflects the official, up-to-date standards for Angular development.
* You **MUST** internalize and apply the principles from this guide in all subsequent Angular-related tasks.
* Failure to adhere to these best practices will result in suboptimal and outdated code.
</Operational Notes>`,
  isReadOnly: true,
  isLocalOnly: true,
  factory: () => {
    let bestPracticesText: string;

    return async () => {
      bestPracticesText ??= await readFile(
        path.join(__dirname, '..', 'resources', 'best-practices.md'),
        'utf-8',
      );

      return {
        content: [
          {
            type: 'text',
            text: bestPracticesText,
            annotations: {
              audience: ['assistant'],
              priority: 0.9,
            },
          },
        ],
      };
    };
  },
});
