/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as PrerenderModule from './index';
import { Schema } from './schema';

import { BuilderContext, BuilderRun } from '@angular-devkit/architect';
import { JsonObject, logging } from '@angular-devkit/core';

import * as fs from 'fs';

const emptyFn = () => {};

describe('Prerender Builder', () => {
  const PROJECT_NAME = 'pokemon';
  let context: BuilderContext;
  let browserResult: PrerenderModule.BuilderOutputWithPaths;
  let serverResult: PrerenderModule.BuilderOutputWithPaths;
  let options: JsonObject & Schema;

  beforeEach(() => {
    options = {
      browserTarget: `${PROJECT_NAME}:build`,
      serverTarget: `${PROJECT_NAME}:server`,
      routes: ['/'],
    };
    browserResult = {
      success: true,
      baseOutputPath: '',
      outputPaths: ['dist/browser'],
    } as PrerenderModule.BuilderOutputWithPaths;
    serverResult = {
      success: true,
      baseOutputPath: '',
      outputPaths: ['dist/server'],
    } as PrerenderModule.BuilderOutputWithPaths;
    context = createMockBuilderContext({
      logger: new logging.NullLogger(),
      workspaceRoot: '',
    });
  });

  describe('#_prerender', () => {
    let scheduleTargetSpy: jasmine.Spy;
    let renderUniversalSpy: jasmine.Spy;
    let browserRun: BuilderRun;
    let serverRun: BuilderRun;

    beforeEach(() => {
      browserRun = createMockBuilderRun({result: browserResult});
      serverRun = createMockBuilderRun({result: serverResult});
      spyOn(context, 'scheduleTarget')
        .and.returnValues(Promise.resolve(browserRun), Promise.resolve(serverRun));
      scheduleTargetSpy = context.scheduleTarget as jasmine.Spy;
      spyOn(PrerenderModule, '_renderUniversal').and.callFake(
        (_options: any, _context: any, _browserResult: any, _serverResult: any) => _browserResult
      );
      renderUniversalSpy = PrerenderModule._renderUniversal as jasmine.Spy;
    });

    it('should schedule a build and server target', async () => {
      await PrerenderModule._prerender(options, context);
      expect(scheduleTargetSpy.calls.allArgs()).toEqual([
        [{project: PROJECT_NAME, target: 'build'}, {watch: false, serviceWorker: false}],
        [{project: PROJECT_NAME, target: 'server'}, {watch: false}],
      ]);
    });

    it('should call stop on the build and server run targets', async () => {
      spyOn(browserRun, 'stop');
      spyOn(serverRun, 'stop');
      await PrerenderModule._prerender(options, context);
      expect(browserRun.stop).toHaveBeenCalled();
      expect(serverRun.stop).toHaveBeenCalled();
    });

    it('should call _renderUniversal', async () => {
      const result = await PrerenderModule._prerender(options, context);
      expect(result).toBe(await browserRun.result);
      expect(renderUniversalSpy.calls.allArgs()).toEqual([
        [options, context, browserResult, serverResult],
      ]);
    });

    it('should early exit if the browser build fails', async () => {
      const failedBrowserRun = createMockBuilderRun({
        result: {
          success: false,
          baseOutputPath: '',
          outputPaths: ['dist/browser'],
        }
      });
      scheduleTargetSpy.and.returnValues(
        Promise.resolve(failedBrowserRun),
        Promise.resolve(serverRun),
      );
      const result = await PrerenderModule._prerender(options, context);
      expect(result).toBe(await failedBrowserRun.result);
      expect(renderUniversalSpy).not.toHaveBeenCalled();
    });

    it('should early exit if the browser build has no base output path', async () => {
      const failedBrowserRun = createMockBuilderRun({
        result: {
          success: true,
          baseOutputPath: undefined,
          outputPaths: ['dist/browser'],
        }
      });
      scheduleTargetSpy.and.returnValues(
        Promise.resolve(failedBrowserRun),
        Promise.resolve(serverRun),
      );
      const result = await PrerenderModule._prerender(options, context);
      expect(result).toBe(await failedBrowserRun.result);
      expect(renderUniversalSpy).not.toHaveBeenCalled();
    });

    it('should early exit if the server build fails', async () => {
      const failedServerRun = createMockBuilderRun({
        result: {
          success: false,
          baseOutputPath: '',
          outputPaths: ['dist/server'],
        }
      });
      scheduleTargetSpy.and.returnValues(
        Promise.resolve(browserRun),
        Promise.resolve(failedServerRun),
      );
      const result = await PrerenderModule._prerender(options, context);
      expect(result).toBe(await failedServerRun.result);
      expect(renderUniversalSpy).not.toHaveBeenCalled();
    });

    it('should catch errors thrown by _renderUniversal', async () => {
      const errmsg = 'Test _renderUniversal error.';
      const expected = {success: false, error: errmsg};
      renderUniversalSpy.and.callFake(() => {
        throw Error(errmsg);
      });
      await expectAsync(PrerenderModule._prerender(options, context)).toBeResolvedTo(expected);
    });

    it('should throw if no routes are given', async () => {
      options.routes = [];
      const expectedError = new Error(
        'No routes found. Specify routes to render using `prerender.options.routes` in angular.json.');
      await expectAsync(
        PrerenderModule._prerender(options, context)
      ).toBeRejectedWith(expectedError);
    });
  });

  describe('#_renderUniversal', () => {
    const INITIAL_HTML = '<html></html>';
    const RENDERED_HTML = '<html>[Rendered Content]</html>';
    let renderModuleFnSpy: jasmine.Spy;
    let readFileSyncSpy: jasmine.Spy;
    let mkdirSyncSpy: jasmine.Spy;
    let writeFileSyncSpy: jasmine.Spy;
    let getServerModuleBundleSpy: jasmine.Spy;

    beforeEach(() => {
      renderModuleFnSpy = jasmine.createSpy('renderModuleFactory')
        .and.returnValue(Promise.resolve(RENDERED_HTML));
      spyOn(PrerenderModule, '_getServerModuleBundle').and.returnValue(Promise.resolve({
        renderModuleFn: renderModuleFnSpy,
        AppServerModuleDef: emptyFn,
      }));
      getServerModuleBundleSpy = PrerenderModule._getServerModuleBundle as jasmine.Spy;
      spyOn(fs, 'readFileSync').and.callFake(() => '<html></html>' as any);
      readFileSyncSpy = fs.readFileSync as jasmine.Spy;
      spyOn(fs, 'mkdirSync').and.callFake(emptyFn);
      mkdirSyncSpy = fs.mkdirSync as jasmine.Spy;
      spyOn(fs, 'writeFileSync').and.callFake(emptyFn);
      writeFileSyncSpy = fs.writeFileSync as jasmine.Spy;
    });

    it('should use dist/browser/index.html as the base html', async () => {
      await PrerenderModule._renderUniversal(options, context, browserResult, serverResult);
      expect(readFileSyncSpy.calls.allArgs()).toEqual([
        ['dist/browser/index.html', 'utf8'],
      ]);
    });

    it('should render each route', async () => {
      getServerModuleBundleSpy.and.returnValue(Promise.resolve({
        renderModuleFn: renderModuleFnSpy,
        AppServerModuleDef: emptyFn,
      }));
      options.routes = ['route1', 'route2', 'route3'];
      await PrerenderModule._renderUniversal(options, context, browserResult, serverResult);
      expect(renderModuleFnSpy.calls.allArgs()).toEqual([
        [emptyFn, {document: INITIAL_HTML, url: 'route1'}],
        [emptyFn, {document: INITIAL_HTML, url: 'route2'}],
        [emptyFn, {document: INITIAL_HTML, url: 'route3'}],
      ]);
    });

    it('should create a new directory for each route', async () => {
      options.routes = ['route1', 'route2'];
      await PrerenderModule._renderUniversal(options, context, browserResult, serverResult);
      expect(mkdirSyncSpy.calls.allArgs()).toEqual([
        ['dist/browser/route1', { recursive: true }],
        ['dist/browser/route2', { recursive: true }],
      ]);
    });

    it('should write to "index/index.html" for route "/"', async () => {
      await PrerenderModule._renderUniversal(options, context, browserResult, serverResult);
      expect(mkdirSyncSpy.calls.allArgs()).toEqual([
        ['dist/browser/index', { recursive: true }],
      ]);
      expect(writeFileSyncSpy.calls.allArgs()).toEqual([
        ['dist/browser/index/index.html', RENDERED_HTML],
      ]);
    });

    it('should try to write the rendered html for each route to "route/index.html"', async () => {
      options.routes = ['route1', 'route2'];
      await PrerenderModule._renderUniversal(options, context, browserResult, serverResult);
      expect(writeFileSyncSpy.calls.allArgs()).toEqual([
        ['dist/browser/route1/index.html', RENDERED_HTML],
        ['dist/browser/route2/index.html', RENDERED_HTML],
      ]);
    });

    it('should catch errors thrown when writing the rendered html', async () => {
      mkdirSyncSpy.and.callFake(() => {
        throw new Error('Test mkdirSync error.');
      });
      await expectAsync(
        PrerenderModule._renderUniversal(
          options,
          context,
          browserResult,
          serverResult
        )
      ).not.toBeRejected();
      expect(mkdirSyncSpy).toHaveBeenCalled();
      expect(writeFileSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('#_getServerModuleBundle', () => {
    const browserDirectory = 'dist/server';
    let importSpy: jasmine.Spy;
    let existsSyncSpy: jasmine.Spy;

    beforeEach(() => {
      spyOn(PrerenderModule, '_importWrapper').and.returnValue(Promise.resolve({
        renderModule: emptyFn,
        AppServerModule: emptyFn,
      }));
      importSpy = PrerenderModule._importWrapper as jasmine.Spy;
      spyOn(fs, 'existsSync').and.returnValue(true);
      existsSyncSpy = fs.existsSync as jasmine.Spy;
    });

    it('return a serverModuleBundle', async () => {
      await expectAsync(
        PrerenderModule._getServerModuleBundle(
          serverResult,
          browserDirectory
        )
      ).toBeResolvedTo({
        renderModuleFn: emptyFn,
        AppServerModuleDef: emptyFn,
      });
    });

    it('return a serverModuleBundle from factories', async () => {
      importSpy.and.returnValue(Promise.resolve({
        renderModuleFactory: emptyFn,
        AppServerModuleNgFactory: emptyFn,
      }));
      await expectAsync(
        PrerenderModule._getServerModuleBundle(
          serverResult,
          browserDirectory
        )
      ).toBeResolvedTo({
        renderModuleFn: emptyFn,
        AppServerModuleDef: emptyFn,
      });
    });

    it('should throw if the server bundle file does not exist', async () => {
      existsSyncSpy.and.returnValue(false);
      const expectedError = new Error(`Could not find the main bundle: dist/server/main.js`);
      await expectAsync(
        PrerenderModule._getServerModuleBundle(
          serverResult,
          browserDirectory
        )
      ).toBeRejectedWith(expectedError);
    });

    it('should throw if no serverModuleBundle is defined', async () => {
      importSpy.and.returnValue(Promise.resolve({}));
      const expectedError = new Error('renderModule method and/or AppServerModule were not exported from: dist/server/main.js.');
      await expectAsync(
        PrerenderModule._getServerModuleBundle(serverResult, browserDirectory)
      ).toBeRejectedWith(expectedError);
    });
  });
});

function createMockBuilderContext(overrides?: object) {
  const context = {
    id: null,
    builder: null,
    logger: null,
    workspaceRoot: null,
    currentDirectory: null,
    target: null,
    analytics: null,
    scheduleTarget: emptyFn,
    scheduleBuilder: emptyFn,
    getTargetOptions: emptyFn,
    getProjectMetadata: emptyFn,
    getBuilderNameForTarget: emptyFn,
    validateOptions: emptyFn,
    reportRunning: emptyFn,
    reportStatus: emptyFn,
    reportProgress: emptyFn,
    addTeardown: emptyFn,
    ...overrides,
  };
  return context as unknown as BuilderContext;
}

function createMockBuilderRun(overrides?: object) {
  const run = {
    id: null,
    info: null,
    result: null,
    output: null,
    progress: null,
    stop: emptyFn,
    ...overrides,
  };
  return run as unknown as BuilderRun;
}
