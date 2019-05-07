/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonParseMode, parseJsonAst } from '@angular-devkit/core';
import {
  Rule,
  Tree,
} from '@angular-devkit/schematics';
import {
  NodeDependency,
  NodeDependencyType,
  addPackageJsonDependency,
} from '../../utility/dependencies';
import { findPropertyInAstObject } from '../../utility/json-utils';

const ruleMapping: {[key: string]: string} = {
  'contextual-life-cycle': 'contextual-lifecycle',
  'no-conflicting-life-cycle-hooks': 'no-conflicting-lifecycle',
  'no-life-cycle-call': 'no-lifecycle-call',
  'use-life-cycle-interface': 'use-lifecycle-interface',
  'decorator-not-allowed': 'contextual-decorator',
  'enforce-component-selector': 'use-component-selector',
  'no-output-named-after-standard-event': 'no-output-native',
  'use-host-property-decorator': 'no-host-metadata-property',
  'use-input-property-decorator': 'no-inputs-metadata-property',
  'use-output-property-decorator': 'no-outputs-metadata-property',
  'no-queries-parameter': 'no-queries-metadata-property',
  'pipe-impure': 'no-pipe-impure',
  'use-view-encapsulation': 'use-component-view-encapsulation',
  i18n: 'template-i18n',
  'banana-in-box': 'template-banana-in-box',
  'no-template-call-expression': 'template-no-call-expression',
  'templates-no-negated-async': 'template-no-negated-async',
  'trackBy-function': 'template-use-track-by-function',
  'no-attribute-parameter-decorator': 'no-attribute-decorator',
  'max-inline-declarations': 'component-max-inline-declarations',
};

export const updateTsLintConfig = (): Rule => {
  return (host: Tree) => {
    const tsLintPath = '/tslint.json';
    const buffer = host.read(tsLintPath);
    if (!buffer) {
      return host;
    }
    const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);

    if (tsCfgAst.kind != 'object') {
      return host;
    }

    const rulesNode = findPropertyInAstObject(tsCfgAst, 'rules');
    if (!rulesNode || rulesNode.kind != 'object') {
      return host;
    }

    const recorder = host.beginUpdate(tsLintPath);

    rulesNode.properties.forEach(prop => {
      const mapping = ruleMapping[prop.key.value];
      if (mapping) {
        recorder.remove(prop.key.start.offset + 1, prop.key.value.length);
        recorder.insertLeft(prop.key.start.offset + 1, mapping);
      }
    });

    host.commitUpdate(recorder);

    return host;
  };
};

export const updatePackageJson = () => {
  return (host: Tree) => {
    const dependency: NodeDependency = {
      type: NodeDependencyType.Dev,
      name: 'codelyzer',
      version: '^5.0.1',
      overwrite: true,
    };

    addPackageJsonDependency(host, dependency);
  };
};
