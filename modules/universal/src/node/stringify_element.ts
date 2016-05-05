// dom closure

import {ListWrapper, MapWrapper} from '@angular/core/src/facade/collection';
import {isPresent, isString, StringWrapper} from '@angular/core/src/facade/lang';

import {Parse5DomAdapter} from '@angular/platform-server';
Parse5DomAdapter.makeCurrent(); // ensure Parse5DomAdapter is used
import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
var DOM: any = getDOM();

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
