

export function escapeRegExp(str): string {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


export function replaceUniversalAppIf(str, replaceText, updatedText) {
  return str
    .replace(new RegExp('_nghost-'+ escapeRegExp(replaceText), 'g'), '_nghost-' + updatedText)
    .replace(new RegExp('_ngcontent-'+ escapeRegExp(replaceText), 'g'), '_ngcontent-' + updatedText);

}

export function selectorReplaceRegExpFactory(selector: string): RegExp {
  return new RegExp(`<(${ escapeRegExp(selector) })([^>]*)>([\\n\\s\\S]*?)<\\/(${ escapeRegExp(selector) })>`, 'gi');
}

export function linkRefRegExpFactory(selector: string): RegExp {
  return new RegExp(`<(${ escapeRegExp(selector) })([^>]*)rel="stylesheet"([^>]*)>`, 'gi');
}


export function replaceElementTag(str, fromValue, toValue) {
  return str.replace(selectorReplaceRegExpFactory(`${fromValue}`), `<${toValue}$2>$3</${toValue}>`)
}
export function replaceVoidElementTag(str, fromValue, toValue, remove: string = '') {
  return str.replace(linkRefRegExpFactory(`${fromValue}`), `<${remove}${toValue}$2rel="stylesheet"$3>`)
}
export function transformDocument(document: string): string {
  let newDoc = document;
  newDoc = replaceElementTag(newDoc, 'UNIVERSAL-SCRIPT', 'script');
  newDoc = replaceElementTag(newDoc, 'UNIVERSAL-STYLE', 'style');
  newDoc = replaceVoidElementTag(newDoc, 'meta UNIVERSAL-LINK=""', 'link');
  return newDoc;
}
