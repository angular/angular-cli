import * as FS from 'fs';
import * as Path from 'path';
import * as ts from 'typescript';
import { ParsedConfiguration, TsEmitArguments } from '@angular/compiler-cli';

import { WebpackResourceLoader } from '../resource_loader';
import { createEmitCallback } from './perform_compile_async';
import { inlineResources } from '../transformers/inline_resources';
import { inlineMetadataBundle } from './inline_metadata';
import { NgcCompilerHost } from './ngc_compiler_host';
import { createSrcToOutPathMapper } from './util';

export function createContext(config: ParsedConfiguration) {
  let sourceToOutMapper: (srcFileName: string, reverse?: boolean) => string;

  const compilerHost = new NgcCompilerHost(config.options, new WebpackResourceLoader());
  const getResource = (resourcePath: string) => compilerHost.getResource(resourcePath);
  const realEmitCallback = createEmitCallback(config.options);

  /**
   * Inline a single metadata.json module (not flat module)
   */
  const inlineMetadataModule = (fileName: string, data: string): string => {
    const metadataBundle = JSON.parse(data);

    let relativeTo = Path.dirname(fileName);
    if (sourceToOutMapper) {
      relativeTo = sourceToOutMapper(relativeTo, true);
    }

    // process the metadata bundle and inline resources
    // we send the source location as the relative folder (not the dest) so matching resource paths
    // with compilerHost will work.
    metadataBundle.forEach( (m: any) => inlineMetadataBundle(relativeTo, m, getResource) );

    return JSON.stringify(metadataBundle);
  };

  /**
   * A wrapper around the actual emit callback that allow creating a file system path mapper
   * between source and destination.
   */
  const emitCallback = (emitArgs: TsEmitArguments) => {
    const writeFile = (...args: any[]) => {
      // we don't need to collect all source files mappings, we need only 1 so it's a bit different
      // from angular's code
      if (!sourceToOutMapper) {
        const outFileName: string = args[0];
        const sourceFiles: ts.SourceFile[] = args[4];
        if (sourceFiles && sourceFiles.length == 1) {
          sourceToOutMapper = createSrcToOutPathMapper(
            config.options.outDir,
            sourceFiles[0].fileName,
            outFileName
          );
        }
      }
      return emitArgs.writeFile.apply(null, args);
    };
    return realEmitCallback(Object.create(emitArgs, { writeFile: { value: writeFile } }));
  };

  return {
    compilerHost,

    /**
     * Returns the source file to destination file mapper used to map source files to dest files.
     * The mapper is available after after the compilation is done.
     */
    getSourceToOutMapper(): ( (srcFileName: string, reverse?: boolean) => string ) | undefined {
      return sourceToOutMapper;
    },

    createCompilation(compiler: any) {
      const compilation = compiler.createCompilation();
      compilerHost.resourceLoader.update(compilation);
      return compilation;
    },

    getResource,

    createInlineResourcesTransformer() {
      return inlineResources(
        getResource,
        (fName: string) => !fName.endsWith('.ngfactory.ts') && !fName.endsWith('.ngstyle.ts')
      );
    },

    emitCallback,

    /**
     * Returns a compilerHost instance that inline all resources (templateUrl, styleUrls)
     * inside metadata files that was created for a specific module
     * (i.e. not a flat metadata bundle module)
     */
    resourceInliningCompilerHost() {
      return Object.create(compilerHost, {
        writeFile: {
          writable: true,
          value: (fileName: string, data: string, ...args: any[]): void => {
            if (/\.metadata\.json$/.test(fileName)) {
              data = inlineMetadataModule(fileName, data);
            }
            return compilerHost.writeFile(fileName, data, args[0], args[1], args[2]);
          }
        }
      });
    },

    inlineFlatModuleMetadataBundle(relativeTo: string, flatModuleOutFile: string): void {
      let metadataPath = Path.resolve(
        relativeTo,
        flatModuleOutFile.replace(/\.js$/, '.metadata.json')
      );

      if (sourceToOutMapper) {
        metadataPath = sourceToOutMapper(metadataPath);
      }

      if (!FS.existsSync(metadataPath)) {
        throw new Error(`Could not find flat module "metadata.json" output at ${metadataPath}`);
      }

      const metadataBundle = JSON.parse(FS.readFileSync(metadataPath, { encoding: 'utf8' }));

      // process the metadata bundle and inline resources.
      // We set the relative base folder to be the source code and not destination
      // because the cached resources in the compiler host are id'ed by
      // the source path.
      inlineMetadataBundle(relativeTo, metadataBundle, getResource);

      FS.writeFileSync(metadataPath, JSON.stringify(metadataBundle), { encoding: 'utf8' });
    }
  };
}
