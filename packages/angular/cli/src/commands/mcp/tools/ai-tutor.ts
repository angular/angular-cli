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

export const AI_TUTOR_TOOL = declareTool({
  name: 'ai_tutor',
  title: 'Start Angular AI Tutor',
  description: `
<Purpose>
Activates the Angular AI Tutor, an interactive guide to building a complete, modern Angular application from the ground up.
The tutor follows a structured curriculum and fosters critical thinking by explaining concepts and providing project-specific exercises.
</Purpose>
<Use Cases>
* Start a guided, step-by-step tutorial for learning Angular.
* Resume a previous tutoring session. The tutor will analyze your project files to determine your progress.
* Learn modern Angular patterns and best practices for version 20.
</Use Cases>
<Operational Notes>
* The tutor will guide you through building a "Smart Recipe Box" application.
* You can control the learning experience with commands like "skip this section" or "set my experience level to beginner."
* The tutor has access to your project files and will use them to verify your solutions.
</Operational Notes>
`,
  isReadOnly: true,
  isLocalOnly: true,
  factory: () => {
    let aiTutorText: string;

    return async () => {
      aiTutorText ??= await readFile(
        path.join(__dirname, '..', 'resources', 'ai-tutor.md'),
        'utf-8',
      );

      return {
        content: [
          {
            type: 'text',
            text: aiTutorText,
            annotations: {
              audience: ['system'],
              priority: 1.0,
            },
          },
        ],
      };
    };
  },
});
