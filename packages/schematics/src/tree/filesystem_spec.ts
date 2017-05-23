import {FileSystemTree} from './filesystem';
import {NodeJsHost} from './node-host';

import {join} from 'path';


const root = join((global as any)._SdkRoot, 'tests/@angular/schematics/assets/1/');
const host = new NodeJsHost(root);

describe('FileSystem', () => {
  it('can create files', () => {
    const tree = new FileSystemTree(host);
    expect(tree.files).toEqual(['/hello', '/sub/directory/file2', '/sub/file1']);
  });
});
