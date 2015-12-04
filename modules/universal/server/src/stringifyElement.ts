// dom closure
import {Parse5DomAdapter} from 'angular2/src/core/dom/parse5_adapter';
Parse5DomAdapter.makeCurrent();

import {ListWrapper, MapWrapper} from 'angular2/src/facade/collection';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {isPresent, isString, StringWrapper} from 'angular2/src/facade/lang';

var _singleTagWhitelist = ['br', 'hr', 'input'];
export function stringifyElement(el): string {
  var result = '';
  if (DOM.isElementNode(el)) {
    var tagName = DOM.tagName(el).toLowerCase();
    // Opening tag
    result += `<${tagName}`;
    // Attributes in an ordered way
    var attributeMap = DOM.attributeMap(el);
    var keys = [];
    attributeMap.forEach((v, k) => { keys.push(k); });
    keys.sort();
    for (let i = 0; i < keys.length; i++) {
      var key = keys[i];
      var attValue = attributeMap.get(key);
      if (!isString(attValue)) {
        result += ` ${key}`;
      } else {
        result += ` ${key}="${attValue}"`;
      }
    }
    result += '>';
    // Children
    var children = DOM.childNodes(DOM.templateAwareRoot(el));
    for (let j = 0; j < children.length; j++) {
      result += stringifyElement(children[j]);
    }
    // Closing tag
    if (!ListWrapper.contains(_singleTagWhitelist, tagName)) {
      result += `</${tagName}>`;
    }
  } else if (DOM.isCommentNode(el)) {
    result += `<!--${DOM.nodeValue(el)}-->`;
  } else {
    result += DOM.getText(el);
  }
  return result;
}
