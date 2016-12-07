const Task = require('../ember-cli/lib/models/task');

import * as compiler from '@angular/compiler';
import {Extractor} from '@angular/compiler-cli';
import * as tsc from '@angular/tsc-wrapped';
import * as ts from 'typescript';
import * as path from 'path';
import * as chalk from 'chalk';

export const Extracti18nTask = Task.extend({
  run: function () {
    const ui = this.ui;
    const project = path.resolve(this.project.root, 'src');
    const cliOptions = new tsc.I18nExtractionCliOptions({
      i18nFormat: this.i18nFormat
    });

    function extract (
      ngOptions: tsc.AngularCompilerOptions, cliOptions: tsc.I18nExtractionCliOptions,
      program: ts.Program, host: ts.CompilerHost) {

      const resourceLoader: compiler.ResourceLoader = {
        get: (s: string) => {
          if (!host.fileExists(s)) {
            // Return empty string to avoid extractor stop processing
            return Promise.resolve('');
          }
          return Promise.resolve(host.readFile(s));
        }
      };
      const extractor =
        Extractor.create(ngOptions, cliOptions.i18nFormat, program, host, resourceLoader);

      const bundlePromise: Promise<compiler.MessageBundle> = extractor.extract();

      return (bundlePromise).then(messageBundle => {
        let ext: string;
        let serializer: compiler.Serializer;
        const format = (cliOptions.i18nFormat || 'xlf').toLowerCase();
        switch (format) {
          case 'xmb':
            ext = 'xmb';
            serializer = new compiler.Xmb();
            break;
          case 'xliff':
          case 'xlf':
            const htmlParser = new compiler.I18NHtmlParser(new compiler.HtmlParser());
            ext = 'xlf';
            serializer = new compiler.Xliff(htmlParser, compiler.DEFAULT_INTERPOLATION_CONFIG);
            break;
          default:
            throw new Error('Unknown i18n output format. For available formats, see \`ng help\`.');
        }

        const dstPath = path.join(ngOptions.genDir, `messages.${ext}`);
        host.writeFile(dstPath, messageBundle.write(serializer), false);
      });
    }

    return tsc.main(project, cliOptions, extract)
      .catch((e) => {
        ui.writeLine(chalk.red(e.message));
      });
  }
});
