import * as child_process from 'node:child_process';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const initialStatusRegex = /Running (\d+) tests/;

async function main() {
  const [runfilesDir, targetName, testArgs] = process.argv.slice(2);
  const maxShards = 4;

  const testEntrypoint = path.resolve(runfilesDir, '../', targetName);
  const testWorkingDir = path.resolve(runfilesDir, '_main');
  const tasks = [];
  const progress = {};

  for (let i = 0; i < maxShards; i++) {
    tasks.push(
      spawnTest(
        'bash',
        [testEntrypoint, ...testArgs.split(' ').filter((arg) => arg !== '')],
        {
          cwd: testWorkingDir,
          env: {
            // Try to construct a pretty hermetic environment, as within Bazel.
            PATH: process.env.PATH,
            TEST_TOTAL_SHARDS: maxShards,
            TEST_SHARD_INDEX: i,
            E2E_SHARD_TOTAL: process.env.E2E_SHARD_TOTAL,
            E2E_SHARD_INDEX: process.env.E2E_SHARD_INDEX,
            FORCE_COLOR: '3',
            // Needed by `rules_js`
            BAZEL_BINDIR: '.',
          },
        },
        (s) => (progress[i] = s),
      ),
    );
  }

  const printUpdate = () => {
    console.error(`----`);
    for (const [taskId, status] of Object.entries(progress)) {
      const durationInMin = (Date.now() - status.startTime) / 1000 / 60;
      console.error(
        `Shard #${taskId}: stage ${status.state} | ` +
          `${status.current}/${status.max} tests completed (${durationInMin.toFixed(2)}min)`,
      );
    }
  };

  const progressInterval = setInterval(printUpdate, 4000);

  try {
    const outputs = await Promise.all(tasks);
    printUpdate();

    for (const [idx, text] of outputs.entries()) {
      console.log(`---------- ${idx} -----------`);
      console.log(text);
    }

    console.error('');
    console.error('Done! Passing');
  } catch (e) {
    if (e instanceof TestSpawnError) {
      console.error(e.output);
      console.error(e.message);
    } else if (e instanceof Error) {
      console.error(e.message, e.stack);
    } else {
      console.error(e);
    }

    console.error('Tests failed!');
    process.exitCode = 1;
  } finally {
    clearInterval(progressInterval);
  }
}

function spawnTest(cmd, args, options, reportStatus, startTime = Date.now(), testAttempts = 2) {
  testAttempts -= 1;

  const testProgressRegex = /Running test[^\(]+\((\d+) of/g;

  return new Promise((resolve, reject) => {
    let output = '';
    let state = 'setup';
    let current = 0;
    let max = 0;

    const proc = child_process.spawn(cmd, args, { ...options, stdio: 'pipe' });
    const syncStatus = () => reportStatus({ current, max, state, startTime });
    const restartTest = () => {
      console.error(output);
      console.error(`Test restarted due to failure.`);
      resolve(spawnTest(cmd, args, options, reportStatus, startTime, testAttempts));
    };
    const onOutputChange = () => {
      // Extract initial status (i.e. how many tests there are in this shard)
      if (initialStatusRegex.test(output) && state === 'setup') {
        max = Number(output.match(initialStatusRegex)[1]);
      }
      if (/Running initializer/.test(output) && state === 'setup') {
        state = 'initializing';
      }
      if (/Running test/.test(output) && state === 'initializing') {
        state = 'testing';
      }
      if (state === 'testing') {
        const oldLastIndex = testProgressRegex.lastIndex;
        const newMatch = testProgressRegex.exec(stripVTControlCharacters(output))?.[1];
        // Do not advance the Regex, or more precisely, reset to index `0`.
        if (newMatch === undefined) {
          testProgressRegex.lastIndex = oldLastIndex;
        } else {
          current = Number(newMatch);
        }
      }
      syncStatus();
    };
    proc.stdout.on('data', (data) => {
      output += data;
      onOutputChange();
    });
    proc.stderr.on('data', (data) => {
      output += data;
      onOutputChange();
    });
    proc.on('error', (err) => {
      syncStatus();

      // If this test failed and there are test attempts remaining, re-run.
      if (testAttempts > 0) {
        restartTest();
        return;
      }

      reject(new TestSpawnError(err.message, output));
    });
    proc.on('close', (code, signal) => {
      syncStatus();

      if (code === 0 && signal === null) {
        resolve(output);
      } else {
        if (testAttempts > 0) {
          restartTest();
          return;
        }

        reject(
          new TestSpawnError(`Command failed with code: ${code} and signal ${signal}`, output),
        );
      }
    });

    // Report initial status, without knowing anything.
    syncStatus();
  });
}

class TestSpawnError extends Error {
  /** @type {string} */
  output;

  constructor(message, output) {
    super(message);
    this.output = output;
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
