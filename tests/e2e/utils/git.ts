import { git, silentGit } from './process';

export async function gitClean(): Promise<void> {
  await silentGit('clean', '-df');
  await silentGit('reset', '--hard');
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
