const script: string = process.argv[2];
const moduleToExec = require(script);
const defaultExport: () => Promise<void> | void =
  typeof moduleToExec == 'function'
    ? moduleToExec
    : typeof moduleToExec.default == 'function'
      ? moduleToExec.default
      : () => {
          throw new Error('Invalid module.');
        };

(async () => {
  try {
    await defaultExport();
  } catch (e) {
    console.error('Process error', e);
    process.exitCode = -1;
  } finally {
    process.exit();
  }
})();
