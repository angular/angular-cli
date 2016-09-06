import {git} from './process';


export function gitClean() {
  return git('clean', '-df')
    .then(() => git('reset', '--hard'))
    .then(() => expectGitToBeClean());
}

export function expectGitToBeClean() {
  return git('status', '--porcelain')
    .then(output => {
      if (output != '') {
        throw new Error('Git repo is not clean...');
      }
    });
}
