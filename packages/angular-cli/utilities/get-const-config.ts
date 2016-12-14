import findParentModule from './find-parent-module';
import * as astUtils from './ast-utils';
import * as ts from 'typescript';

export default function getConstConfig(project: any, dir: string, identifier: string): string {
    let modulePrefix = '';
    try {
        let pathToModule = findParentModule(project, dir);
        astUtils.getSourceNodes(astUtils.getSource(pathToModule))
            .last((node: ts.Node) => {
                // tslint:disable-next-line:no-bitwise
                return (node.flags & ts.NodeFlags.Export) !== 0
                    && node.getText().includes(identifier);
            })
            .subscribe((node: ts.Node) => {
                modulePrefix = /= ?['"]([\w-]+)["']/.exec(node.getText())[1];
            });
    } catch (e) {
        console.log(`no const configuration found for ${identifier} in the parent module\n\t`);
    }
    return modulePrefix;
}
