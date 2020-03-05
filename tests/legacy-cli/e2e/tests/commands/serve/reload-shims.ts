import { prependToFile, writeFile } from '../../../utils/fs';
import { execAndWaitForOutputToMatch, killAllProcesses } from '../../../utils/process';

export default async function() {
  // Simulate a JS library using a Node.js specific module
  await writeFile('src/node-usage.js', `const path = require('path');\n`);
  await prependToFile('src/main.ts', `import './node-usage';\n`);

  try {
    // Make sure serve is consistent with build
    await execAndWaitForOutputToMatch(
      'ng',
      ['build'],
      /Module not found: Error: Can't resolve 'path'/,
    );
    // The Node.js specific module should not be found
    await execAndWaitForOutputToMatch(
      'ng',
      ['serve', '--port=0'],
      /Module not found: Error: Can't resolve 'path'/,
    );
  } finally {
    killAllProcesses();
  }
}
