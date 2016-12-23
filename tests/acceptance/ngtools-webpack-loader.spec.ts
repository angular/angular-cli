'use strict';

// This needs to be first so fs module can be mocked correctly.
import { expect } from 'chai';

import { removeModuleIdOnlyForTesting } from '../../packages/@ngtools/webpack/src/loader';

describe('@ngtools webpack loader: ', () => {
  describe('removeModuleId', () => {
    let refactor: any;
    let moduleIdProp: any;
    let commaProp: any;
    let removeNodesArgs: any;
    beforeEach(() => {
      commaProp = { isCommaProp: true };
      moduleIdProp = {
        name: { getText: () => 'moduleId' },
        parent: { getChildAt: () => ({ getChildren: (): any => [{}, commaProp] }) }
      };
      refactor = {
        sourceFile: 'sourceFile',
        findAstNodes: (): any => [{ properties: [moduleIdProp] }],
        removeNodes: (...args: any[]) => { removeNodesArgs = args; }
      };
    });

    it('should remove "moduleId: module.id"', () => {
      removeModuleIdOnlyForTesting(refactor);
      expect(removeNodesArgs[0]).to.equal(moduleIdProp);
      expect(removeNodesArgs[1]).to.equal(commaProp);
    });
  });
});
