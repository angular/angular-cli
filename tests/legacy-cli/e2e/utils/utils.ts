
export function expectToFail(fn: () => Promise<any>, errorMessage?: string): Promise<any> {
  return fn()
    .then(() => {
      const functionSource = fn.name || (<any>fn).source || fn.toString();
      const errorDetails = errorMessage ? `\n\tDetails:\n\t${errorMessage}` : '';
      throw new Error(
        `Function ${functionSource} was expected to fail, but succeeded.${errorDetails}`);
    }, (err) => { return err; });
}

export function wait(msecs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, msecs);
  });
}
