/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { interpolateName } from 'loader-utils';
import * as postcss from 'postcss';
import * as url from 'url';
import * as webpack from 'webpack';

function wrapUrl(url: string): string {
  let wrappedUrl;
  const hasSingleQuotes = url.indexOf('\'') >= 0;

  if (hasSingleQuotes) {
    wrappedUrl = `"${url}"`;
  } else {
    wrappedUrl = `'${url}'`;
  }

  return `url(${wrappedUrl})`;
}

export interface PostcssCliResourcesOptions {
  deployUrl?: string;
  filename: string;
  loader: webpack.loader.LoaderContext;
}

async function resolve(
  file: string,
  base: string,
  resolver: (file: string, base: string) => Promise<string>
): Promise<string> {
  try {
    return await resolver('./' + file, base);
  } catch (err) {
    return resolver(file, base);
  }
}

export default postcss.plugin('postcss-cli-resources', (options: PostcssCliResourcesOptions) => {
  const { deployUrl, filename, loader } = options;

  const process = async (inputUrl: string, resourceCache: Map<string, string>) => {
    // If root-relative or absolute, leave as is
    if (inputUrl.match(/^(?:\w+:\/\/|data:|chrome:|#|\/)/)) {
      return inputUrl;
    }
    // If starts with a caret, remove and return remainder
    // this supports bypassing asset processing
    if (inputUrl.startsWith('^')) {
      return inputUrl.substr(1);
    }

    const cachedUrl = resourceCache.get(inputUrl);
    if (cachedUrl) {
      return cachedUrl;
    }

    const { pathname, hash, search } = url.parse(inputUrl.replace(/\\/g, '/'));
    const resolver = (file: string, base: string) => new Promise<string>((resolve, reject) => {
      loader.resolve(base, file, (err, result) => {
        if (err) {
         reject(err);
         return;
        }
        resolve(result);
      });
    });

    const result = await resolve(pathname, loader.context, resolver);

    return new Promise<string>((resolve, reject) => {
      loader.fs.readFile(result, (err: Error, content: Buffer) => {
        if (err) {
          reject(err);
          return;
        }

        const outputPath = interpolateName(
          { resourcePath: result } as webpack.loader.LoaderContext,
          filename,
          { content },
        );

        loader.addDependency(result);
        loader.emitFile(outputPath, content, undefined);

        let outputUrl = outputPath.replace(/\\/g, '/');
        if (hash || search) {
          outputUrl = url.format({ pathname: outputUrl, hash, search });
        }

        if (deployUrl) {
          outputUrl = url.resolve(deployUrl, outputUrl);
        }

        resourceCache.set(inputUrl, outputUrl);

        resolve(outputUrl);
      });
    });
  };

  return (root) => {
    const urlDeclarations: Array<postcss.Declaration> = [];
    root.walkDecls(decl => {
      if (decl.value && decl.value.includes('url')) {
        urlDeclarations.push(decl);
      }
    });

    if (urlDeclarations.length === 0) {
      return;
    }

    const resourceCache = new Map<string, string>();

    return Promise.all(urlDeclarations.map(async decl => {
      const value = decl.value;
      const urlRegex = /url\(\s*['"]?([ \S]+?)['"]??\s*\)/g;
      const segments: string[] = [];

      let match;
      let lastIndex = 0;
      let modified = false;
      // tslint:disable-next-line:no-conditional-assignment
      while (match = urlRegex.exec(value)) {
        let processedUrl;
        try {
          processedUrl = await process(match[1], resourceCache);
        } catch (err) {
          loader.emitError(decl.error(err.message, { word: match[1] }).toString());
          continue;
        }

        if (lastIndex !== match.index) {
          segments.push(value.slice(lastIndex, match.index));
        }

        if (!processedUrl || match[1] === processedUrl) {
          segments.push(match[0]);
        } else {
          segments.push(wrapUrl(processedUrl));
          modified = true;
        }

        lastIndex = urlRegex.lastIndex;
      }

      if (modified) {
        decl.value = segments.join('');
      }
    }));
  };
});
