import { prebootstrap } from '../../src/inline/preboot_inline';
import { prebootClient } from '../../src/browser/preboot_browser';
import { getMockElement, addParent } from '../preboot_test_utils';
import {
  ServerClientRoot,
  NodeContext,
  Element,
} from '../../src/preboot_interfaces';

describe('node unit test for preboot_inline', function () {
  let preboot = prebootstrap();
  let client = prebootClient();

  describe('createBuffer()', function () {
    it('should return server node if rootSelector is the body', function () {
      let root = <ServerClientRoot> {
        serverSelector: 'body',
        serverNode: {}
      };

      let actual = preboot.createBuffer(root);
      expect(actual).toBe(root.serverNode);
    });

    it('should clone the node and insert before', function () {
      let root = <ServerClientRoot> {
        serverSelector: 'div',
        serverNode: getMockElement()
      };
      let clientNode = { style: { display: 'block' } };
      root.serverNode.cloneNode = function () {
        return clientNode;
      };

      let actual = preboot.createBuffer(root);
      expect(actual).toBe(clientNode);
    });
  });

  describe('getSelection()', function () {
    it('should return default if no value', function () {
      let node = <Element> {};
      let expected = {
        start: 0,
        end: 0,
        direction: 'forward'
      };

      let actual = preboot.getSelection(node);
      expect(actual).toEqual(expected);
    });

    it('should return selection for older browsers', function () {
      let node = <Element> { value: 'foo' };
      let expected = {
        start: 3,
        end: 3,
        direction: 'forward'
      };

      let actual = preboot.getSelection(node);
      expect(actual).toEqual(expected);
    });

    it('should return selection for modern browsers', function () {
      let node = <Element> {
        value: 'foo',
        selectionStart: 1,
        selectionEnd: 2,
        selectionDirection: 'reverse'
      };
      let expected = {
        start: 1,
        end: 2,
        direction: 'reverse'
      };

      let actual = preboot.getSelection(node);
      expect(actual).toEqual(expected);
    });
  });

  describe('getNodeKey()', function () {
    it('should be the EXACT same code as is in the preboot_browser', function () {
        expect(preboot.getNodeKey.toString().replace(/\s/g, ''))
          .toEqual(client.getNodeKey.toString().replace(/\s/g, ''));
    });

    it('should generate a default name', function () {
      let nodeContext = <NodeContext> {
        root: {
          serverSelector: '#myApp',
          clientSelector: '#myApp',
          serverNode: {},
          clientNode: {},
        },
        node: {}
      };
      let expected = 'unknown_#myApp';
      let actual = preboot.getNodeKey(nodeContext);
      expect(actual).toEqual(expected);
    });

    it('should generate a name for a deeply nested element', function () {
      let node = { nodeName: 'foo' };
      let nodeContext = <NodeContext> {
        root: {
          serverSelector: '#myApp',
          serverNode: {
            childNodes:  [{}, {}, {
              childNodes:  [{}, {
                childNodes:  [{}, {}, {}, node]
              }]
            }]
          },
          clientNode: {}
        },
        node: node
      };

      // add parent references to the rootServerNode tree
      addParent(nodeContext.root.serverNode);

      let expected = 'foo_#myApp_s3_s2_s4';
      let actual = preboot.getNodeKey(nodeContext);
      expect(actual).toEqual(expected);
    });
  });

  describe('createListenHandler()', function () {
      it('should do nothing if not listening', function () {
        let prebootData = {
          listening: false
        };
        let eventSelector = {
          selector: '',
          events: <[string]> [],
          preventDefault: true
        };
        let appData = {
          root: {
            serverSelector: '',
            serverNode: {}
          },
          events: []
        };
        let event = {
          preventDefault: function () {}
        };

        spyOn(event, 'preventDefault');

        let handler = preboot.createListenHandler(prebootData, eventSelector, appData);
        handler(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
      });
  });

});
