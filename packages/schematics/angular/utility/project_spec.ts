/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ProjectType, WorkspaceProject } from '../utility/workspace-models';
import { buildDefaultPath } from './project';


describe('project', () => {
  describe('buildDefaultPath', () => {
    let project: WorkspaceProject;
    beforeEach(() => {
      project = {
        projectType: ProjectType.Application,
        root: 'foo',
        prefix: 'app',
      };
    });

    it('should handle projectType of application', () => {
      const result = buildDefaultPath(project);
      expect(result).toEqual('/foo/src/app');
    });

    it('should handle projectType of library', () => {
      project = { ...project, projectType: ProjectType.Library };
      const result = buildDefaultPath(project);
      expect(result).toEqual('/foo/src/lib');
    });

    it('should handle sourceRoot', () => {
      project = { ...project, sourceRoot: 'foo/bar/custom' };
      const result = buildDefaultPath(project);
      expect(result).toEqual('/foo/bar/custom/app');
    });
  });
});
