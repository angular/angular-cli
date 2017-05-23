import {Rule} from '../engine/interface';
import {Tree} from '../tree/interface';


export function move(root: string): Rule {
  return (tree: Tree) => {
    tree.files.forEach(originalPath => tree.rename(originalPath, `${root}/${originalPath}`));
    return tree;
  };
}
