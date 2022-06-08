import { git, silentGit } from './process';

export async function gitClean(): Promise<void> {
  console.log('  Cleaning git...');

  await silentGit('clean', '-df');
  await silentGit('reset', '--hard');

  // Checkout missing files
  const { stdout } = await silentGit('status', '--porcelain');
  const files = stdout
    .split(/[\n\r]+/g)
    .filter((line) => line.match(/^ D/))
    .map((line) => line.replace(/^\s*\S+\s+/, ''));

  await silentGit('checkout', ...files);
  await expectGitToBeClean();
}

export async function expectGitToBeClean(): Promise<void> {
  const { stdout } = await silentGit('status', '--porcelain');
  if (stdout != '') {
    throw new Error('Git repo is not clean...\n' + stdout);
  }
}

export async function gitCommit(message: string): Promise<void> {
  await git('add', '-A');
  const { stdout } = await silentGit('status', '--porcelain');
  if (stdout != '') {
    await git('commit', '-am', message);
  }
}
