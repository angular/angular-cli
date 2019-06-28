const fs = require("fs");
const path = require("path");

export const profileWrapFn = async fn => {
  const CPU_PROFILE = false;
  const HEAP_SNAPSHOT = false;
  const HEAP_PROFILE = false;
  const sampleInterval = 45 * 1000. // 15s

  let before = async () => { };
  let after = async () => { };

  // Call fn after interval ms, wait for it to finish, then repeat.
  // Returns a callback that calls fn one last time and stops repeating.
  const rollingTimeout = (fn, interval) => {
    let lastTimeout;
    const chainedTimeout = () =>
      lastTimeout = setTimeout(async () => {
        await fn();
        chainedTimeout();
      }, interval);

    chainedTimeout();

    const stopCb = async () => {
      clearTimeout(lastTimeout);
      await fn();
    };

    return stopCb;
  };

  // Check if we need to profile this run.
  if (CPU_PROFILE || HEAP_SNAPSHOT || HEAP_PROFILE) {
    // No colons ISO format, suitable for filenames.
    const basicISONow = () => new Date().toISOString().replace(/[-.:]/g, '');
    const inspector = require('inspector');
    const promisify = require('util').promisify;
    const session = new inspector.Session();

    // Adding a method because of https://github.com/nodejs/node/issues/13338#issuecomment-307165905.
    session.postPromise = promisify(session.post);
    session.connect();

    if (CPU_PROFILE) {
      console.error('\n@angular/cli: taking CPU profile');
      // Start the CPU profiler.
      before = async () => {
        await session.postPromise('Profiler.enable');
        await session.postPromise('Profiler.start');
      };

      // Save the CPU profile after execution has finished.
      after = async () => {
        const { profile } = await session.postPromise('Profiler.stop');
        const profilePath = path.resolve(process.cwd(), `NG_PROFILE_${basicISONow()}.cpuprofile`);
        fs.writeFileSync(profilePath, JSON.stringify(profile));
        console.error('\n@angular/cli: saved CPU profile to', profilePath);
      };
    } else if (HEAP_SNAPSHOT) {
      console.error('\n@angular/cli: taking heap snapshots');
      // Take a single heap snapshot, and wait for it to be written to disk.
      // These snapshots can be quite big and also take some time to write, so they shouldn't be
      // written too frequently.
      const writeHeapSnapshot = async () => {
        const profilePath = path.resolve(process.cwd(), `NG_PROFILE_${basicISONow()}.heapsnapshot`);
        console.error('\n@angular/cli: saving heap snapshot to', profilePath);
        // TODO: figure out why I sometimes get the errors below
        // (node:1260) [EPERM] Error: EPERM: operation not permitted, write
        const fd = fs.openSync(profilePath, 'w');

        session.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
          fs.writeSync(fd, m.params.chunk);
        });

        await session.postPromise('HeapProfiler.writeHeapSnapshot');
        fs.closeSync(fd);
        console.error('\n@angular/cli: saved heap snapshot to', profilePath);
      }

      // Create a heap snapshot every sampleInterval seconds.
      let stopCb;
      before = async () => stopCb = rollingTimeout(writeHeapSnapshot, sampleInterval);
      after = async () => stopCb();
    } else if (HEAP_PROFILE) {
      console.error('\n@angular/cli: taking heap profiles');
      // Take a single heap snapshot, and wait for it to be written to disk.
      const writeHeapProfile = async () => {
        const { profile } = await session.postPromise('HeapProfiler.getSamplingProfile');
        const profilePath = path.resolve(process.cwd(), `NG_PROFILE_${basicISONow()}.heapprofile`);
        fs.writeFileSync(profilePath, JSON.stringify(profile));
        console.error('\n@angular/cli: saved heap profile to', profilePath);
      }

      // Start the heap profiler. Create a heap profile every sampleInterval seconds.
      let stopCb;
      before = async () => {
        await session.postPromise('HeapProfiler.enable');
        await session.postPromise('HeapProfiler.startSampling');
        stopCb = rollingTimeout(writeHeapProfile, sampleInterval);
      };
      after = async () => stopCb();
    }
  }


  await before();
  const fnResult = await fn();
  await after();
  return fnResult;
}
