import {CodeGenerator} from '@angular/compiler-cli';


/**
 * Patch the CodeGenerator instance to use a custom reflector host.
 */
export function patchReflectorHost(codeGenerator: CodeGenerator) {
  const reflectorHost = (codeGenerator as any).reflectorHost;
  const oldGIP = reflectorHost.getImportPath;

  reflectorHost.getImportPath = function(containingFile: string, importedFile: string): string {
    // Hack together SCSS and LESS files URLs so that they match what the default ReflectorHost
    // is expected. We only do that for shimmed styles.
    const m = importedFile.match(/(.*)(\.css|\.scss|\.less|\.stylus)((?:\.shim)?)(\..+)/);
    if (!m) {
      return oldGIP.call(this, containingFile, importedFile);
    }

    // We call the original, with `css` in its name instead of the extension, and replace the
    // extension from the result.
    const [, baseDirAndName, styleExt, shim, ext] = m;
    const result = oldGIP.call(this, containingFile, baseDirAndName + '.css' + shim + ext);

    return result.replace(/\.css($|\.)/, styleExt + '$1');
  };
}
