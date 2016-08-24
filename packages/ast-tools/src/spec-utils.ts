
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


function newIt(description: string, fn: () => PromiseLike<any> | void) {
  return (global as any)['it'](description, async(fn));
}


export const it = newIt;
