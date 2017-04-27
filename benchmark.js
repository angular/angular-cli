const spawn = require('child_process').spawn;
const stripAnsi = require('strip-ansi');
const treeKill = require('tree-kill');
const fs  = require('fs');

const cwd = process.cwd();
const editedFile = 'src/main.ts';

const options = {
  iterations: 10,
  multiPromise: serialMultiPromise,
  spawn: matchSpawn,
  commands: [
    { cmd: 'ng', args: ['build'], fn: buildDataFn, comment: 'build time' },
    { cmd: 'ng', args: ['serve'], fn: serveInitialBuildDataFn, comment: 'initial build time' },
    { cmd: 'ng', args: ['serve'], fn: serveThirdRebuildDataFn, comment: 'third rebuild time' },
  ],
  flags: [
    '--aot',
    '--no-sourcemap',
    '--no-vendor-chunk'
  ],
}

runBenchmark(options);

// Returns an array of `length` length, filled with `undefined`
function makeArray(length) {
  return Array.apply(null, Array(length));
}

// Returns a promise with the result of calling `times` times the `fn` function with `args`
// `fn` will be called in parallel, and is expected to return a promise
function parallelMultiPromise(times, fn, ...args) {
  return Promise.all(makeArray(times).map(() => fn.apply(null, args)));
}

// Returns a promise with the result of calling `times` times the `fn` function with `args`
// `fn` will be called in serial, and is expected to return a promise
function serialMultiPromise(times, fn, ...args) {
  let results = [];
  let promise = Promise.resolve();
  makeArray(times).forEach(() => promise = promise.then(() =>
    fn.apply(null, args).then((result) => results.push(result))
  ));
  return promise.then(() => results);
}

// Spawns `cmd` with `args`, calls `dataFn` with the `stdout` output, a `result` var and the process
// `dataFn` is expected to modify `result`
function matchSpawn(dataFn, cmd, args = []) {
  // dataFn will have access to result and use it to store results
  let result = {
    // overrideErr will signal that an error code on the exit event should be ignored
    // this is useful on windows where killing a tree of processes always makes them
    // exit with an error code
    overrideErr: false
  };
  let stdout = '';
  let spawnOptions = {
    cwd: cwd,
    env: process.env
  }

  if (process.platform.startsWith('win')) {
    args = ['/c', cmd].concat(args)
    cmd = 'cmd.exe';
    spawnOptions['stdio'] = 'pipe';
  }

  const childProcess = spawn(cmd, args, spawnOptions);

  childProcess.stdout.on('data', (data) => {
    stdout += data.toString('utf-8');
    dataFn(data, result, childProcess);
  });

  return new Promise((resolve, reject) =>
    childProcess.on('exit', (err) => err && !result.overrideErr
      ? resolve({ err, stdout }) : resolve(result))
  )
}

// data functions used to parse process output and process results
function buildDataFn(data, result, childProcess) {
  let localMatch = data.toString('utf-8').match(/Time: (.*)ms/);
  if (localMatch) { result.match = Number(stripAnsi(localMatch[1])) };
}

function serveInitialBuildDataFn(data, result, childProcess) {
  let localMatch = data.toString('utf-8').match(/Time: (.*)ms/);
  if (localMatch) {
    result.match = Number(stripAnsi(localMatch[1]));
    result.overrideErr = true;
    treeKill(childProcess.pid);
  };
}

function serveThirdRebuildDataFn(data, result, childProcess) {
  let localMatch = data.toString('utf-8').match(/Time: (.*)ms/);
  if (localMatch) {
    result.counter = result.counter ? result.counter + 1 : 1;
    if (result.counter < 4) {
      fs.appendFile(editedFile, '\'benchmark test string\';');
    } else {
      result.match = Number(stripAnsi(localMatch[1]));
      result.overrideErr = true;
      treeKill(childProcess.pid);
    }
  };
}

function average(arr) {
  return arr.reduce((prev, curr) => prev + curr, 0) / arr.length;
}

function combine(a) {
  var fn = function (n, src, got, all) {
    if (n == 0) {
      if (got.length > 0) {
        all[all.length] = got;
      }
      return;
    }
    for (var j = 0; j < src.length; j++) {
      fn(n - 1, src.slice(j + 1), got.concat([src[j]]), all);
    }
    return;
  }
  var all = [];
  for (var i = 0; i < a.length; i++) {
    fn(i, a, [], all);
  }
  if(a.length > 0) { all.push(a); }
  return all;
}

function runBenchmark(options) {
  // backup contents of file that is being edited for rebuilds
  const editedFileContents = fs.readFileSync(editedFile, 'utf8');
  let flagCombinations = combine(options.flags);
  // add empty flag to execute base commands
  flagCombinations.unshift(['']);
  let promise = Promise.resolve();

  console.time('Benchmark execution time');
  console.log(`Angular-CLI Benchmark`);
  console.log(`Extra flags per benchmark: ${options.flags}`);
  console.log(`Iterations per benchmark: ${options.iterations}`);
  console.log('');

  options.commands.forEach((command) => {
    promise = promise.then(() => {
      console.log('=========================================');
      console.log(`Base command: ${command.cmd} ${command.args.join(' ')}`);
      console.log(`Comment: ${command.comment}`);
      console.log('');
    })
    return flagCombinations.forEach((flags) =>
      promise = promise
        .then(() => options.multiPromise(
          options.iterations,
          options.spawn,
          command.fn,
          command.cmd,
          command.args.concat(flags)
        ).then((results) => {
          const failures = results.filter(result => result.error);
          results = results.filter(result => !result.error).map((result) => result.match);
          console.log(`Full command: ${command.cmd} ${command.args.concat(flags).join(' ')}`);
          console.log(`Average time: ${average(results)}`);
          console.log(`Results: ${results.join()}`);
          if (failures.length > 0) { console.log(`Failures: ${failures.length}`); }
          console.log('');
        })
        )
    )
  })
  return promise.then(() => {
    console.timeEnd('Benchmark execution time');
    fs.writeFileSync(editedFile, editedFileContents, 'utf8');
  });
}
