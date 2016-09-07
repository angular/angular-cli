const temp = require('temp');


export default function(argv: any) {
  // Get to a temporary directory.
  let tempRoot = argv.reuse || temp.mkdirSync('angular-cli-e2e-');
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  process.chdir(tempRoot);
}
