/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import { Compiler, compilation } from 'webpack';
import { RawSource, ReplaceSource } from 'webpack-sources';

const parse5 = require('parse5');

export interface IndexHtmlWebpackPluginOptions {
  input: string;
  output: string;
  baseHref?: string;
  entrypoints: string[];
  deployUrl?: string;
  sri: boolean;
}

function readFile(filename: string, compilation: compilation.Compilation): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    compilation.inputFileSystem.readFile(filename, (err: Error, data: Buffer) => {
      if (err) {
        reject(err);

        return;
      }

      let content;
      if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
        // Strip UTF-8 BOM
        content = data.toString('utf8', 3);
      } else if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
        // Strip UTF-16 LE BOM
        content = data.toString('utf16le', 2);
      } else {
        content = data.toString();
      }

      resolve(content);
    });
  });
}

export class IndexHtmlWebpackPlugin {
  private _options: IndexHtmlWebpackPluginOptions;

  constructor(options?: Partial<IndexHtmlWebpackPluginOptions>) {
    this._options = {
      input: 'index.html',
      output: 'index.html',
      entrypoints: ['polyfills', 'main'],
      sri: false,
      ...options,
    };
  }

  apply(compiler: Compiler) {
    compiler.hooks.emit.tapPromise('index-html-webpack-plugin', async compilation => {
      // Get input html file
      const inputContent = await readFile(this._options.input, compilation);
      (compilation as compilation.Compilation & { fileDependencies: Set<string> })
        .fileDependencies.add(this._options.input);


      // Get all files for selected entrypoints
      let unfilteredSortedFiles: string[] = [];
      for (const entryName of this._options.entrypoints) {
        const entrypoint = compilation.entrypoints.get(entryName);
        if (entrypoint && entrypoint.getFiles) {
          unfilteredSortedFiles = unfilteredSortedFiles.concat(entrypoint.getFiles() || []);
        }
      }

      // Filter files
      const existingFiles = new Set<string>();
      const stylesheets: string[] = [];
      const scripts: string[] = [];
      for (const file of unfilteredSortedFiles) {
        if (existingFiles.has(file)) {
          continue;
        }
        existingFiles.add(file);

        if (file.endsWith('.js')) {
          scripts.push(file);
        } else if (file.endsWith('.css')) {
          stylesheets.push(file);
        }

      }

      // Find the head and body elements
      const treeAdapter = parse5.treeAdapters.default;
      const document = parse5.parse(inputContent, { treeAdapter, locationInfo: true });
      let headElement;
      let bodyElement;
      for (const docChild of document.childNodes) {
        if (docChild.tagName === 'html') {
          for (const htmlChild of docChild.childNodes) {
            if (htmlChild.tagName === 'head') {
              headElement = htmlChild;
            }
            if (htmlChild.tagName === 'body') {
              bodyElement = htmlChild;
            }
          }
        }
      }

      if (!headElement || !bodyElement) {
        throw new Error('Missing head and/or body elements');
      }

      // Determine script insertion point
      let scriptInsertionPoint;
      if (bodyElement.__location && bodyElement.__location.endTag) {
        scriptInsertionPoint = bodyElement.__location.endTag.startOffset;
      } else {
        // Less accurate fallback
        // parse5 4.x does not provide locations if malformed html is present
        scriptInsertionPoint = inputContent.indexOf('</body>');
      }

      let styleInsertionPoint;
      if (headElement.__location && headElement.__location.endTag) {
        styleInsertionPoint = headElement.__location.endTag.startOffset;
      } else {
        // Less accurate fallback
        // parse5 4.x does not provide locations if malformed html is present
        styleInsertionPoint = inputContent.indexOf('</head>');
      }

      // Inject into the html
      const indexSource = new ReplaceSource(new RawSource(inputContent), this._options.input);

      const scriptElements = treeAdapter.createDocumentFragment();
      for (const script of scripts) {
        const attrs = [
          { name: 'type', value: 'text/javascript' },
          { name: 'src', value: (this._options.deployUrl || '') + script },
        ];

        if (this._options.sri) {
          const content = compilation.assets[script].source();
          attrs.push(...this._generateSriAttributes(content));
        }

        const element = treeAdapter.createElement('script', undefined, attrs);
        treeAdapter.appendChild(scriptElements, element);
      }

      indexSource.insert(
        scriptInsertionPoint,
        parse5.serialize(scriptElements, { treeAdapter }),
      );

      // Adjust base href if specified
      if (typeof this._options.baseHref == 'string') {
        let baseElement;
        for (const headChild of headElement.childNodes) {
          if (headChild.tagName === 'base') {
            baseElement = headChild;
          }
        }

        const baseFragment = treeAdapter.createDocumentFragment();

        if (!baseElement) {
          baseElement = treeAdapter.createElement(
            'base',
            undefined,
            [
              { name: 'href', value: this._options.baseHref },
            ],
          );

          treeAdapter.appendChild(baseFragment, baseElement);
          indexSource.insert(
            headElement.__location.startTag.endOffset + 1,
            parse5.serialize(baseFragment, { treeAdapter }),
          );
        } else {
          let hrefAttribute;
          for (const attribute of baseElement.attrs) {
            if (attribute.name === 'href') {
              hrefAttribute = attribute;
            }
          }
          if (hrefAttribute) {
            hrefAttribute.value = this._options.baseHref;
          } else {
            baseElement.attrs.push({ name: 'href', value: this._options.baseHref });
          }

          treeAdapter.appendChild(baseFragment, baseElement);
          indexSource.replace(
            baseElement.__location.startOffset,
            baseElement.__location.endOffset,
            parse5.serialize(baseFragment, { treeAdapter }),
          );
        }
      }

      const styleElements = treeAdapter.createDocumentFragment();
      for (const stylesheet of stylesheets) {
        const attrs = [
          { name: 'rel', value: 'stylesheet' },
          { name: 'href', value: (this._options.deployUrl || '') + stylesheet },
        ];

        if (this._options.sri) {
          const content = compilation.assets[stylesheet].source();
          attrs.push(...this._generateSriAttributes(content));
        }

        const element = treeAdapter.createElement('link', undefined, attrs);
        treeAdapter.appendChild(styleElements, element);
      }

      indexSource.insert(
        styleInsertionPoint,
        parse5.serialize(styleElements, { treeAdapter }),
      );

      // Add to compilation assets
      compilation.assets[this._options.output] = indexSource;
    });
  }

  private _generateSriAttributes(content: string) {
    const algo = 'sha384';
    const hash = createHash(algo)
      .update(content, 'utf8')
      .digest('base64');

    return [
      { name: 'integrity', value: `${algo}-${hash}` },
      { name: 'crossorigin', value: 'anonymous' },
    ];
  }
}
