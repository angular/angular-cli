/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, SchematicsException } from '@angular-devkit/schematics';

export default function(): Rule {
    return (tree, context) => {
        let content = tree.read('/migrations');

        // Append the information to migration file. We then verify the order of execution.
        if (!content) {
            tree.create('/migrations', '[]');
            content = tree.read('/migrations');

            if (!content) {
                throw new SchematicsException();
            }
        }

        const json = JSON.parse(content.toString('utf-8'));
        json.push(context.schematic.description.name);

        tree.overwrite('/migrations', JSON.stringify(json));

        return tree;
    };
}
