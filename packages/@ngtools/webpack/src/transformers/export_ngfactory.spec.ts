// @ignoreDep typescript
import * as ts from 'typescript';
import { oneLine, stripIndent } from 'common-tags';
import { transformTypescript } from './ast_helpers';
import { exportNgFactory } from './export_ngfactory';

describe('@ngtools/webpack transformers', () => {
  describe('replace_resources', () => {
    it('should replace resources', () => {
      const input = stripIndent`
        export { AppModule } from './app/app.module';
      `;
      const output = stripIndent`
        export { AppModuleNgFactory } from "./app/app.module.ngfactory";
        export { AppModule } from './app/app.module';
      `;

      const transformOpsCb = (sourceFile: ts.SourceFile) =>
        exportNgFactory(sourceFile, { path: '/app.module', className: 'AppModule' });
      const result = transformTypescript(input, transformOpsCb);

      expect(oneLine`${result}`).toEqual(oneLine`${output}`);
    });
  });
});
