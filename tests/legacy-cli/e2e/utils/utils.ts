import assert from 'node:assert';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function expectToFail(fn: () => Promise<any>, errorMessage?: string): Promise<Error> {
  return fn().then(
    () => {
      const functionSource = fn.name || (<any>fn).source || fn.toString();
      const errorDetails = errorMessage ? `\n\tDetails:\n\t${errorMessage}` : '';
      throw new Error(
        `Function ${functionSource} was expected to fail, but succeeded.${errorDetails}`,
      );
    },
    (err) => {
      return err instanceof Error ? err : new Error(err);
    },
  );
}

export async function mktempd(prefix: string, tempRoot?: string): Promise<string> {
  return realpath(await mkdtemp(path.join(tempRoot ?? tmpdir(), prefix)));
}

export async function mockHome(cb: (home: string) => Promise<void>): Promise<void> {
  const tempHome = await mktempd('angular-cli-e2e-home-');

  const oldHome = process.env.HOME;
  process.env.HOME = tempHome;

  try {
    await cb(tempHome);
  } finally {
    process.env.HOME = oldHome;

    await rm(tempHome, { recursive: true, force: true });
  }
}

export function assertIsError(value: unknown): asserts value is Error & { code?: string } {
  const isError =
    value instanceof Error ||
    // The following is needing to identify errors coming from RxJs.
    (typeof value === 'object' && value && 'name' in value && 'message' in value);
  assert(isError, 'catch clause variable is not an Error instance');
}
