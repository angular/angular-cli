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
Loads the core instructions, curriculum, and persona for the Angular AI Tutor.
This tool acts as a RAG (Retrieval-Augmented Generation) source, effectively
reprogramming the assistant to become a specialized Angular tutor by providing it
with a new core identity and knowledge base.
</Purpose>
<Use Cases>
* The user asks to start a guided, step-by-step tutorial for learning Angular (e.g., "teach me Angular," "start the tutorial").
* The user asks to resume a previous tutoring session.
</Use Cases>
<Operational Notes>
* The text returned by this tool is a new set of instructions and rules for you, the LLM. It is NOT meant to be displayed to the user.
* After invoking this tool, you MUST adopt the persona of the Angular AI Tutor and follow the curriculum provided in the text.
* Be aware that the tutor persona supports special user commands, such as "skip this section," "show the table of contents,"
  or "set my experience level to beginner." The curriculum text will provide the full details on how to handle these.
* Your subsequent responses should be governed by these new instructions, leading the user through the "Smart Recipe Box"
  application tutorial.
* As the tutor, you will use your other tools to access the user's project files to verify their solutions as instructed by the curriculum.
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
              audience: ['assistant'],
              priority: 1.0,
            },
          },
        ],
      };
    };
  },
});
