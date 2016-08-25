// This file exports a version of the Jasmine `it` that understands promises.
// To use this, simply `import {it} from './spec-utils`.
// TODO(hansl): move this to its own Jasmine-TypeScript package.

function async(fn: () => PromiseLike<any> | void) {
  return (done: DoneFn) => {
    let result: PromiseLike<any> | void = null;

    try {
      result = fn();

      if (result && 'then' in result) {
        (result as Promise<any>).then(done, done.fail);
      } else {
        done();
      }
    } catch (err) {
      done.fail(err);
    }
  };
}


export function it(description: string, fn: () => PromiseLike<any> | void) {
  return (global as any)['it'](description, async(fn));
}
