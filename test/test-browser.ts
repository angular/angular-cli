// Load karma not outside. Karma pollutes Promise with a different implementation.
import {join} from 'path';

let karma = require('karma');

new karma.Server({
  configFile: join(__dirname, 'karma.conf.js'),
  singleRun: true
}, (exitCode: number) => {
  // Immediately exit the process if Karma reported errors, because due to
  // potential still running tunnel-browsers gulp won't exit properly.
  if (exitCode === 0) {
    process.exit(exitCode);
  }
}).start();
