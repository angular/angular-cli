import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as MemoryFS from 'memory-fs';
import { CliConfig } from '../models/config';

export class HtmlCliPlugin {
  private cachedTemplate: string;

  apply(compiler) {
    if (compiler.options.name === 'main' && CliConfig.fromProject().apps[0].mobile) {
      compiler.plugin('emit', this.cacheTemplate);
    }
    compiler.plugin('done', this.generateIndexHtml);
  }

  cacheTemplate(c, callback) {
    const sourceDir = CliConfig.fromProject().defaults.sourceDir;
    const projectRoot = path.resolve(sourceDir, '..');
    const appShellPath = path.resolve(projectRoot, `./${sourceDir}/main-app-shell.ts`);
    const appShell = require(appShellPath);
    const bootloader = appShell.getBootloader();
    const indexHtml = path.resolve(sourceDir, 'index.html');
    const assetsPath = path.resolve(projectRoot, 'cli.assets.json');

    appShell.serialize(bootloader, fs.readFileSync(indexHtml, 'utf8')).then(html => {
      console.log(html)
      this.cachedTemplate = html;
      callback();
    });
  }

  generateIndexHtml(stats) {
    const isMobile = CliConfig.fromProject().apps[0].mobile;
    const sourceDir = CliConfig.fromProject().defaults.sourceDir;
    const projectRoot = path.resolve(sourceDir, '..');
    const assetsPath = path.resolve(projectRoot, 'cli.assets.json');
    const contents = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
    const indexHtml = path.resolve(sourceDir, 'index.html');
    let tpl;
    let mfs;
    let files = { js: [], css: [] };

    Object.keys(contents).forEach(key => {
      let type = Object.keys(contents[key])[0];
      files[type].unshift(contents[key][type]);
    });

    if (this.cachedTemplate) {
      tpl = this.cachedTemplate;
      tpl = _.template(tpl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/##/g, '%')); 
      writeTemplate(stats, tpl, files);
    } else {
      tpl = _.template(fs.readFileSync(indexHtml, 'utf8').replace(/##/g, '%'));
      writeTemplate(stats, tpl, files);
    }

    function writeTemplate(stats, tpl, files) {
      const destHtml = path.resolve(stats.compilation.compiler.outputPath, 'index.html');

      if (stats.compilation.compiler.outputFileSystem instanceof MemoryFS) {
        if (!mfs) { mfs = stats.compilation.compiler.outputFileSystem; }
        mfs.writeFileSync(destHtml, tpl({ files: files }), 'utf8');
      } else {
        fs.writeFileSync(destHtml, tpl({ files: files }), 'utf8');
      }
    }
  }

}
