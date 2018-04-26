/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import { Compiler, compilation } from 'webpack';
import { RawSource } from 'webpack-sources';

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
      const document = parse5.parse(inputContent, { treeAdapter });
      let headElement;
      let bodyElement;
      for (const topNode of document.childNodes) {
        if (topNode.tagName === 'html') {
          for (const htmlNode of topNode.childNodes) {
            if (htmlNode.tagName === 'head') {
              headElement = htmlNode;
            }
            if (htmlNode.tagName === 'body') {
              bodyElement = htmlNode;
            }
          }
        }
      }

      // Inject into the html

      if (!headElement || !bodyElement) {
        throw new Error('Missing head and/or body elements');
      }

      for (const script of scripts) {
        const attrs = [
          { name: 'type', value: 'text/javascript' },
          { name: 'src', value: (this._options.deployUrl || '') + script },
        ];
        if (this._options.sri) {
          const algo = 'sha384';
          const hash = createHash(algo)
            .update(compilation.assets[script].source(), 'utf8')
            .digest('base64');
          attrs.push(
            { name: 'integrity', value: `${algo}-${hash}` },
            { name: 'crossorigin', value: 'anonymous' },
          );
        }

        const element = treeAdapter.createElement(
          'script',
          undefined,
          attrs,
        );
        treeAdapter.appendChild(bodyElement, element);
      }

      // Adjust base href if specified
      if (this._options.baseHref != undefined) {
        let baseElement;
        for (const node of headElement.childNodes) {
          if (node.tagName === 'base') {
            baseElement = node;
            break;
          }
        }

        if (!baseElement) {
          const element = treeAdapter.createElement(
            'base',
            undefined,
            [
              { name: 'href', value: this._options.baseHref },
            ],
          );
          treeAdapter.appendChild(headElement, element);
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
        }
      }

      for (const stylesheet of stylesheets) {
        const element = treeAdapter.createElement(
          'link',
          undefined,
          [
            { name: 'rel', value: 'stylesheet' },
            { name: 'href', value: (this._options.deployUrl || '') + stylesheet },
          ],
        );
        treeAdapter.appendChild(headElement, element);
      }

      // Add to compilation assets
      const outputContent = parse5.serialize(document, { treeAdapter });
      compilation.assets[this._options.output] = new RawSource(outputContent);
    });
  }
}
