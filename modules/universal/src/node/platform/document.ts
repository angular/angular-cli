import {OpaqueToken} from 'angular2/core';
import {Parser, Serializer, TreeAdapters} from 'parse5';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';

const parser = new Parser(TreeAdapters.htmlparser2);
// TODO(gdi2290): fix encodeHtmlEntities: true
const serializer = new Serializer(TreeAdapters.htmlparser2, { encodeHtmlEntities: false });
const treeAdapter = parser.treeAdapter;

export function isTag(tagName, node): boolean {
  return node.type === 'tag' && node.name === tagName;
}

export function parseFragment(el: string): Object {
  return parser.parseFragment(el);
}

export function parseDocument(documentHtml: string): Object {
  if (!documentHtml) {
    throw new Error('parseDocument requires a document string');
  }
  if (typeof documentHtml !== 'string') {
    throw new Error('parseDocument needs to be a string to be parsed correctly');
  }
  const doc = parser.parse(documentHtml);
  let rootNode;
  let bodyNode;
  let headNode;
  let titleNode;

  for (let i = 0; i < doc.children.length; ++i) {
    const child = doc.children[i];

    if (isTag('html', child)) {
      rootNode = child;
      break;
    }
  }

  if (!rootNode) {
    rootNode = doc;
  }

  for (let i = 0; i < rootNode.children.length; ++i) {
    const child = rootNode.children[i];

    if (isTag('head', child)) {
      headNode = child;
    }

    if (isTag('body', child)) {
      bodyNode = child;
    }
  }

  if (!headNode) {
    headNode = treeAdapter.createElement('head', null, []);
    DOM.appendChild(doc, headNode);
  }

  if (!bodyNode) {
    bodyNode = treeAdapter.createElement('body', null, []);
    DOM.appendChild(doc, bodyNode);
  }

  for (let i = 0; i < headNode.children.length; ++i) {
    if (isTag('title', headNode.children[i])) {
      titleNode = headNode.children[i];
      break;
    }
  }

  if (!titleNode) {
    titleNode = treeAdapter.createElement('title', null, []);
    DOM.appendChild(headNode, titleNode);
  }

  doc._window = {};
  doc.head = headNode;
  doc.body = bodyNode;

  const titleNodeText = titleNode.children[0];

  Object.defineProperty(doc, 'title', {
    get: () => titleNodeText.data,
    set: (newTitle) => titleNodeText.data = newTitle
  });

  return doc;
}

export function serializeDocument(document: Object): string {
  return serializer.serialize(document);
}
