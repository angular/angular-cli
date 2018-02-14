import { RawSource } from 'webpack-sources';

const parse5 = require('parse5');

export interface IndexHtmlWebpackPluginOptions {
  input: string;
  output: string;
  baseHref?: string;
  entrypoints: string[];
  deployUrl?: string;
}

function readFile(filename: string, compilation: any): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    compilation.inputFileSystem.readFile(filename, (err: Error, data: Buffer) => {
      if (err) {
        reject(err);
        return;
      }

      const content = data.toString();
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
      ...options
    };
  }

  apply(compiler: any) {
    compiler.hooks.emit.tapPromise('index-html-webpack-plugin', async (compilation: any) => {
      // Get input html file
      const inputContent = await readFile(this._options.input, compilation);
      compilation.fileDependencies.add(this._options.input);


      // Get all files for selected entrypoints
      const unfilteredSortedFiles: string[] = [];
      for (const entryName of this._options.entrypoints) {
        const entrypoint = compilation.entrypoints.get(entryName);
        if (entrypoint) {
          unfilteredSortedFiles.push(...entrypoint.getFiles());
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
        const element = treeAdapter.createElement(
          'script',
          undefined,
          [
            { name: 'type', value: 'text/javascript' },
            { name: 'src', value: (this._options.deployUrl || '') + script },
          ]
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
            ]
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
          ]
        );
        treeAdapter.appendChild(headElement, element);
      }

      // Add to compilation assets
      const outputContent = parse5.serialize(document, { treeAdapter });
      compilation.assets[this._options.output] = new RawSource(outputContent);
    });
  }
}
