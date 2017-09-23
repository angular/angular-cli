import * as fs from 'fs-extra';

const root = process.cwd();

export function setup(path: string) {
  process.chdir(root);

  return fs.remove(path).then(function () {
    fs.mkdirsSync(path);
  });
};

export function teardown(path: string) {
  process.chdir(root);

  if (fs.pathExistsSync(path)) {
    return fs.remove(path);
  } else {
    return Promise.resolve();
  }
};
