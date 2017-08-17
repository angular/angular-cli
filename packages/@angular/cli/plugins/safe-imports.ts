import * as webpack from 'webpack';
const HarmonyImportDependency = require('webpack/lib/dependencies/HarmonyImportDependency');
const HarmonyImportSpecifierDependency =
  require('webpack/lib/dependencies/HarmonyImportSpecifierDependency');

export interface SafeImportsPluginOptions {
  hintText?: string;
  include?: (dep: any) => boolean;
  exclude?: (dep: any) => boolean;
}

export class SafeImportDependencyTemplate {
  constructor(private options: SafeImportsPluginOptions) {}

  apply(dep: any, source: any, outputOptions: any, requestShortener: any) {
    let content: string = HarmonyImportDependency
      .makeImportStatement(true, dep, outputOptions, requestShortener);

    if (content && this.shouldAddHint(dep)) {
      content = content.split('=').reduce((prev, cur) => {
        return prev + `= /*${this.options.hintText}*/` + cur;
      });
    }

    source.replace(dep.range[0], dep.range[1] - 1, '');
    source.insert(-1, content);
  }

  private shouldAddHint(dep: any): boolean {
    if (!dep.module) {
      return false;
    }
    if (this.options.exclude
      && this.options.exclude(dep)) {
      return false;
    }
    if (this.options.include
      && this.options.include(dep)) {
      return true;
    }
    return false;
  }
}

export class SafeImportSpecifierDependencyTemplate {
  constructor(private options?: SafeImportsPluginOptions) {}

  apply(dep: any, source: any) {
    const originalTemplate = new HarmonyImportSpecifierDependency.Template();

    let content = originalTemplate.getContent(dep);
    if (dep.id === 'ɵccf' || dep.id === 'ɵcmf') {
      content = `/*${this.options.hintText}*/ ` + content;
    }

    source.replace(dep.range[0], dep.range[1] - 1, content);
  }
}

export class SafeImportsPlugin {
  private options: SafeImportsPluginOptions;

  constructor(options?: SafeImportsPluginOptions) {
    const optionDefaults: SafeImportsPluginOptions = {
      hintText: '@__PURE__',
      include: (dep) => /@angular/.test(dep.module.id)
      // || /[\\/]\$\$_gendir[\\/]/.test(dep.module.id)
    };
    this.options = { ...optionDefaults, ...options };
  }

  apply(compiler: webpack.Compiler): void {
    compiler.plugin('after-plugins', () => {
      compiler.plugin('compilation', (compilation: any) => {
        compilation.dependencyTemplates
          .set(HarmonyImportDependency, new SafeImportDependencyTemplate(this.options));
        compilation.dependencyTemplates
          .set(HarmonyImportSpecifierDependency,
            new SafeImportSpecifierDependencyTemplate(this.options));
      });
    });
  }
}
