/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { type AngularHostOptions, createAngularCompilerHost } from './angular-host';

describe('createAngularCompilerHost', () => {
  function createHost() {
    const transformStylesheet = jasmine
      .createSpy<AngularHostOptions['transformStylesheet']>('transformStylesheet')
      .and.resolveTo('.compiled {}');
    const processWebWorker = jasmine
      .createSpy<AngularHostOptions['processWebWorker']>('processWebWorker')
      .and.returnValue('worker.js');

    const host = createAngularCompilerHost(
      ts,
      {},
      {
        transformStylesheet,
        processWebWorker,
      },
      undefined,
    );

    return { host, transformStylesheet };
  }

  describe('readResource', () => {
    it('should not call readFile for .css and .scss stylesheet files', async () => {
      const { host } = createHost();
      const readFileSpy = spyOn(host, 'readFile').and.returnValue('.btn { color: red; }');

      expect(await host.readResource?.('/app/src/app.component.css')).toBe('');
      expect(await host.readResource?.('/app/src/app.component.scss')).toBe('');
      expect(readFileSpy).not.toHaveBeenCalled();
    });

    it('should call readFile for .html and .svg template files', async () => {
      const { host } = createHost();
      const readFileSpy = spyOn(host, 'readFile').and.callFake(
        (fileName) => `<content of ${fileName}>`,
      );

      expect(await host.readResource?.('/app/src/app.component.html')).toBe(
        '<content of /app/src/app.component.html>',
      );
      expect(await host.readResource?.('/app/src/icon.component.svg')).toBe(
        '<content of /app/src/icon.component.svg>',
      );
      expect(readFileSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('transformResource', () => {
    it('should invoke transformStylesheet when context.resourceFile is set even if data is empty', async () => {
      const { host, transformStylesheet } = createHost();

      const result = await host.transformResource?.('', {
        type: 'style',
        containingFile: '/app/src/app.component.ts',
        resourceFile: '/app/src/app.component.scss',
        order: 0,
        className: 'AppComponent',
      });

      expect(result).toEqual({ content: '.compiled {}' });
      expect(transformStylesheet).toHaveBeenCalledOnceWith(
        '',
        '/app/src/app.component.ts',
        '/app/src/app.component.scss',
        0,
        'AppComponent',
      );
    });

    it('should short-circuit empty inline styles without calling transformStylesheet', async () => {
      const { host, transformStylesheet } = createHost();

      const result = await host.transformResource?.('   ', {
        type: 'style',
        containingFile: '/app/src/app.component.ts',
        resourceFile: null,
        order: 0,
        className: 'AppComponent',
      });

      expect(result).toEqual({ content: '' });
      expect(transformStylesheet).not.toHaveBeenCalled();
    });
  });
});
