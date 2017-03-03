
export function expectToFail(fn: () => Promise<any>): Promise<void> {
  return fn()
    .then(() => {
      throw new Error(`Function ${fn.source} was expected to fail, but succeeded.`);
    }, () => {});
}

export function isMobileTest() {
  return !!process.env['MOBILE_TEST'];
}

export function isUniversalTest() {
  return !!process.env['UNIVERSAL'];
}

export function getAppMain() {
  return isUniversalTest() ? 'client' : 'main';
}

export function getClientDist() {
  return isUniversalTest() ? 'dist/client/' : 'dist/';
}

export function getMainAppModuleRegex() {
  return isUniversalTest() ?
    /bootstrapModuleFactory.*\/\* BrowserAppModuleNgFactory \*\// :
    /bootstrapModuleFactory.*\/\* AppModuleNgFactory \*\//;
}

export function wait(msecs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, msecs);
  });
}
