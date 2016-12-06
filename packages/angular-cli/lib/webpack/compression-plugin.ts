/** Forked from https://github.com/webpack/compression-webpack-plugin. */
const async = require('async');
const url = require('url');

const RawSource = require('webpack-sources/lib/RawSource');


export interface CompressionPluginOptions {
  algorithm?: string;
  asset?: string;
  level?: number;
  flush?: boolean;
  chunkSize?: number;
  test?: RegExp | RegExp[];
  windowBits?: number;
  memLevel?: number;
  strategy?: number;
  dictionary?: any;
  threshold?: number;
  minRatio?: number;
}


export class CompressionPlugin {
  private asset = '[path].gz[query]';
  private algorithm: Function;
  private compressionOptions: any = {};
  private test: RegExp[];
  private threshold: number = 0;
  private minRatio: number = 0.8;

  constructor(options: CompressionPluginOptions = {}) {
    if (options.hasOwnProperty('asset')) {
      this.asset = options.asset;
    }

    const algorithm = options.hasOwnProperty('algorithm') ? options.algorithm : 'gzip';

    const zlib = require('zlib');

    this.compressionOptions = {};
    this.algorithm = zlib[algorithm];
    if (!this.algorithm) {
      throw new Error(`Algorithm not found in zlib: "${algorithm}".`);
    }

    this.compressionOptions = {
      level: options.level || 9,
      flush: options.flush,
      chunkSize: options.chunkSize,
      windowBits: options.windowBits,
      memLevel: options.memLevel,
      strategy: options.strategy,
      dictionary: options.dictionary
    };

    if (options.hasOwnProperty('test')) {
      if (Array.isArray(options.test)) {
        this.test = options.test as RegExp[];
      } else {
        this.test = [options.test as RegExp];
      }
    }
    if (options.hasOwnProperty('threshold')) {
      this.threshold = options.threshold;
    }
    if (options.hasOwnProperty('minRatio')) {
      this.minRatio = options.minRatio;
    }
  }

  apply(compiler: any) {
    compiler.plugin('this-compilation', (compilation: any) => {
      compilation.plugin('optimize-assets', (assets: any, callback: Function) => {
        async.forEach(Object.keys(assets), (file: string, callback: Function) => {
          if (this.test.every((t) => !t.test(file))) {
            return callback();
          }

          const asset = assets[file];
          let content = asset.source();
          if (!Buffer.isBuffer(content)) {
            content = new Buffer(content, 'utf-8');
          }

          const originalSize = content.length;
          if (originalSize < this.threshold) {
            return callback();
          }

          this.algorithm(content, this.compressionOptions, (err: Error, result: string) => {
            if (err) {
              return callback(err);
            }
            if (result.length / originalSize > this.minRatio) {
              return callback();
            }

            const parse = url.parse(file);
            const newFile = this.asset
              .replace(/\[file]/g, file)
              .replace(/\[path]/g, parse.pathname)
              .replace(/\[query]/g, parse.query || '');

            assets[newFile] = new RawSource(result);
            callback();
          });
        }, callback);
      });
    });
  }
}
