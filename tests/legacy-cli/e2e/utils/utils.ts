import { mkdtemp, realpath } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export function expectToFail(fn: () => Promise<any>, errorMessage?: string): Promise<any> {
  return fn().then(
    () => {
      const functionSource = fn.name || (<any>fn).source || fn.toString();
      const errorDetails = errorMessage ? `\n\tDetails:\n\t${errorMessage}` : '';
      throw new Error(
        `Function ${functionSource} was expected to fail, but succeeded.${errorDetails}`,
      );
    },
    (err) => {
      return err;
    },
  );
}

export function wait(msecs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, msecs);
  });
}

export async function mktempd(prefix: string): Promise<string> {
  return realpath(await mkdtemp(path.join(tmpdir(), prefix)));
}
