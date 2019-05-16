import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';

export default function () {
  const nestedConfigContent = `
  {
    "rules": {
      "quotemark": [
        true,
        "double",
        "avoid-escape"
      ]
    }
  }`;

  return Promise.resolve()

    // setup a double-quote tslint config
    .then(() => writeFile('src/app/tslint.json', nestedConfigContent))

    // Generate a fixed new component but don't fix rest of app
    .then(() => ng('generate', 'component', 'test-component1', '--lint-fix'))
    .then(() => expectToFail(() => ng('lint')))

    // Fix rest of app and generate new component
    .then(() => ng('lint', '--fix'))
    .then(() => ng('generate', 'component', 'test-component2', '--lint-fix'))
    .then(() => ng('lint'))

    // Enable default option and generate all other module related blueprints
    .then(() => ng('config', 'schematics.@schematics/angular.directive.lintFix', 'true'))
    .then(() => ng('config', 'schematics.@schematics/angular.service.lintFix', 'true'))
    .then(() => ng('config', 'schematics.@schematics/angular.pipe.lintFix', 'true'))
    .then(() => ng('config', 'schematics.@schematics/angular.guard.lintFix', 'true'))
    .then(() => ng('generate', 'directive', 'test-directive'))
    .then(() => ng('generate', 'service', 'test-service'))
    .then(() => ng('generate', 'pipe', 'test-pipe'))
    .then(() => ng('generate', 'guard', 'test-guard'))
    .then(() => ng('lint'));
}
