import {execSync, spawn} from 'child_process';

export function bazelBinDirectory(): string {
  const s = execSync('bazel info bazel-bin').toString();
  return s.substring(0, s.length - 1);
}

export function buildBazel(_ui: any, target: string, silence = false): Promise<any> {
  const stdio = silence ? ['ignore', 'ignore', 'ignore'] : [0, 1, 1];
  return new Promise((resolve, reject) => {
    const bazel = spawn('bazel', ['build', target], {stdio});
    bazel.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

export function buildIBazel(_ui: any, target: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const r = spawn('ibazel', ['build' , target], {stdio: [0, 1, 1]});
    r.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

