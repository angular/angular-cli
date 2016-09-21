import {git, silentGit} from './process';


export function gitClean() {
  console.log('  Cleaning git...');
  return silentGit('clean', '-df')
    .then(() => silentGit('reset', '--hard'))
    .then(() => {
      // Checkout missing files
      return silentGit('status', '--porcelain')
        .then(output => output
          .split(/[\n\r]+/g)
          .filter(line => line.match(/^ D/))
          .map(line => line.replace(/^\s*\S+\s+/, '')))
        .then(files => silentGit('checkout', ...files));
    })
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

export function gitCommit(message: string) {
  return git('add', '-A')
    .then(() => git('status', '--porcelain'))
    .then(output => {
      if (output != '') {
        return git('commit', '-am', message);
      }
    });
}
