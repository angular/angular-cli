import { defaultOptions, assign } from '../src/node/preboot_node';
import { PrebootOptions, Window, Element } from '../src/preboot_interfaces';

export function getMockWindow(): Window {
  return <Window> {
    prebootData: {},
    document: {
      addEventListener: function () {}
    }
  };
}

export function getMockOptions(): PrebootOptions {
  return <PrebootOptions> assign({}, defaultOptions, {
    window: getMockWindow()
  });
}

export function getMockElement(): Element {
  return <Element> {
    cloneNode: () => { return { style: {} }; },
    parentNode: {
      insertBefore: function () {}
    }
  };
}

// add in parent nodes for children
export function addParent(anode) {
  if (anode && anode.childNodes) {
    for (let childNode of anode.childNodes) {
      childNode.parentNode = anode;
      addParent(childNode);
    }
  }
}
