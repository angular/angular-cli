/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, chain } from '@angular-devkit/schematics';
import { updateJsonInTree } from './ast-utils';

export default function (): Rule {
  return chain([addExtensionRecommendations]);
}

const addExtensionRecommendations = updateJsonInTree(
  '.vscode/extensions.json',
  (json: { recommendations?: string[] }) => {
    [
      'angular.ng-template',
      'nrwl.angular-console',
      'ms-vscode.vscode-typescript-tslint-plugin',
      'Mikael.Angular-BeastCode',
      'EditorConfig.EditorConfig',
      'msjsdiag.debugger-for-chrome',
      'eg2.vscode-npm-script',
      'PKief.material-icon-theme',
      'natewallace.angular2-inline'].forEach(extension => {
        json.recommendations = json.recommendations || [];
        if (!json.recommendations.includes(extension)) {
          json.recommendations.push(extension);
        }
      });

    return json;
  },
);
