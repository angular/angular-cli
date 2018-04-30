import { getProjectDetails } from '@angular/cli/utilities/project';
import * as mockFs from 'mock-fs';
import * as os from 'os';
import {join} from 'path';

const homedir = os.homedir();
const cwds = [`${homedir}/proj`, `${homedir}/proj/abc`];
cwds.forEach(cwd => {
  describe(`getProjectDetails (cwd: ${cwd})`, () => {
    beforeEach(() => {
      spyOn(process, 'cwd').and.callFake(() => cwd);
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('should handle finding "angular.json"', () => {
      mockFs({
        [`${homedir}/proj/angular.json`]: 'foo'
      });
      const result = getProjectDetails();
      expect(result.root).toEqual(join(homedir, 'proj'));
      expect(result.configFile).toEqual('angular.json');
    });

    it('should handle finding ".angular.json"', () => {
      mockFs({
        [`${homedir}/proj/.angular.json`]: 'foo'
      });
      const result = getProjectDetails();
      expect(result.root).toEqual(join(homedir, 'proj'));
      expect(result.configFile).toEqual('.angular.json');
    });

    it('should handle finding "angular-cli.json"', () => {
      mockFs({
        [`${homedir}/proj/angular-cli.json`]: 'foo'
      });
      const result = getProjectDetails();
      expect(result.root).toEqual(join(homedir, 'proj'));
      expect(result.configFile).toEqual('angular-cli.json');
    });

    it('should handle finding ".angular-cli.json"', () => {
      mockFs({
        [`${homedir}/proj/.angular-cli.json`]: 'foo'
      });
      const result = getProjectDetails();
      expect(result.root).toEqual(join(homedir, 'proj'));
      expect(result.configFile).toEqual('.angular-cli.json');
    });

    it('should handle not finding a config file at all', () => {
      mockFs({});
      const result = getProjectDetails();
      expect(result).toEqual(null);
    });

    it('should handle searching up the home directory', () => {
      mockFs({
        [`${homedir}/angular.json`]: 'foo'
      });
      const result = getProjectDetails();
      expect(result).toEqual(null);
    });

    it('should handle searching up the home directory', () => {
      mockFs({
        [`${homedir}/.angular-cli.json`]: 'foo'
      });
      const result = getProjectDetails();
      expect(result).toEqual(null);
    });

    it('should handle searching up the home directory and finding a project', () => {
      mockFs({
        [`${homedir}/angular.json`]: 'foo',
        [`${homedir}/package.json`]: JSON.stringify({
          dependencies: {
            '@angular/cli': '0.0.0'
          }
        })
      });
      const result = getProjectDetails();
      expect(result.root).toEqual(homedir);
      expect(result.configFile).toEqual('angular.json');
    });

    it('should handle searching up the home directory and finding a project', () => {
      mockFs({
        [`${homedir}/.angular-cli.json`]: 'foo',
        [`${homedir}/package.json`]: JSON.stringify({
          dependencies: {
            '@angular/cli': '0.0.0'
          }
        })
      });
      const result = getProjectDetails();
      expect(result.root).toEqual(homedir);
      expect(result.configFile).toEqual('.angular-cli.json');
    });
  });
});
