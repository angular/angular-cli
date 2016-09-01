// PRIVATE
import { getDOM } from './__private_imports__';
// PRIVATE

const parse5: any = require('parse5');

// const parser = new Parser(TreeAdapters.htmlparser2);
// TODO(gdi2290): fix encodeHtmlEntities: true
// const serializer = new Serializer(TreeAdapters.htmlparser2, { encodeHtmlEntities: true });
// const treeAdapter = parser.treeAdapter;
const treeAdapter = parse5.treeAdapters.htmlparser2;

export function isTag(tagName, node): boolean {
  return node.type === 'tag' && node.name === tagName;
}

export function parseFragment(el: string): any {
  return parse5.parseFragment(el, { treeAdapter : parse5.treeAdapters.htmlparser2 });
}

export function parseDocument (documentHtml: string): any {
  if (documentHtml === undefined) {
    throw new Error('parseDocument requires a document string');
  }
  if (typeof documentHtml !== 'string') {
    throw new Error('parseDocument needs to be a string to be parsed correctly');
  }

  const doc = parse5.parse(documentHtml, { treeAdapter : parse5.treeAdapters.htmlparser2 });


  /*
  // Build entire doc <!doctype><html> etc
  if (documentHtml.indexOf('<html>') > -1 && documentHtml.indexOf('</html>') > -1) {
    const doc = parser.parse(documentHtml);
  }
  // ASP.NET case : parse only the fragment - don't build entire <html> doc
  const doc = parser.parseFragment(documentHtml);
  */

  let rootNode = undefined;
  let bodyNode = undefined;
  let headNode = undefined;
  let titleNode = undefined;

  for (let i: number = 0; i < doc.childNodes.length; ++i) {
    const child = doc.childNodes[i];

    if (isTag('html', child)) {
      rootNode = child;
      break;
    }
  }

  if (!rootNode) {
    rootNode = doc;
  }


  for (let i: number = 0; i < rootNode.childNodes.length; ++i) {
    const child = rootNode.childNodes[i];

    if (isTag('head', child)) {
      headNode = child;
    }

    if (isTag('body', child)) {
      bodyNode = child;
    }
  }

  if (!headNode) {
    headNode = treeAdapter.createElement('head', null, []);
    getDOM().appendChild(doc, headNode);
  }


  if (!bodyNode) {
    bodyNode = treeAdapter.createElement('body', null, []);
    getDOM().appendChild(doc, bodyNode);
  }

  for (let i = 0; i < headNode.childNodes.length; ++i) {
    if (isTag('title', headNode.childNodes[i])) {
      titleNode = headNode.childNodes[i];
      break;
    }
  }

  if (!titleNode) {
    titleNode = treeAdapter.createElement('title', null, []);
    getDOM().appendChild(headNode, titleNode);
  }

  doc._window = {};
  doc.head = headNode;
  doc.body = bodyNode;


  const titleNodeText = titleNode.childNodes[0];

  Object.defineProperty(doc, 'title', {
    get: () => titleNodeText.data,
    set: (newTitle) => titleNodeText.data = newTitle
  });

  return doc;
}


export function serializeDocument(document: Object, pretty?: boolean): string {
  const doc = parse5.serialize(document, { treeAdapter : parse5.treeAdapters.htmlparser2 });
  if (pretty) {
    const beautify: any = require('js-beautify');
    return beautify.html(doc, {indent_size: 2});
  }
  return doc;
}
