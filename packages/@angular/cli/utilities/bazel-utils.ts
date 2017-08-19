import {exec, execSync, spawn} from 'child_process';

export function bazelBinDirectory(): string {
  const s = execSync('bazel info bazel-bin').toString();
  return s.substring(0, s.length - 1);
}

export function buildBazel(ui: any, target: string): Promise<any> {
  // TODO: vsavkin remove it once static are handled properly
  return new Promise((resolve, reject) => {
    exec(`bazel build ${target}`, (err, stdout, stderr) => {
      if (err) {
        ui.writeError(stderr.toString());
        reject();
      } else {
        ui.write(stdout.toString());
        resolve();
      }
    });
  });
}

export function buildIBazel(ui: any, target: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const r = spawn('ibazel', ['build' , target]);
    r.stdout.on('data', (data) => {
      const s = data.toString();
      if (!s.startsWith('Watching:') && !s.startsWith('State:') &&
        !s.startsWith('Detected source change.')) {
        ui.write(s.toString());
      }
    });

    r.stderr.on('data', (data) => {
      ui.write(data.toString());
    });

    r.on('close', (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject();
      }
    });
  });
}

