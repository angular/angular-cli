/// <reference path="../../../typings/main.d.ts" />
import fs = require('fs');

export function loadSystemJson(systemPath: string): { [name: string]: any } {
  const systemContents: any = fs.readFileSync(systemPath, 'utf8');
  const jsonContent: any = systemContents.match(/^[^\{]*([\s\S]+)\);.*$/m)[1];
  
  return JSON.parse(jsonContent);
}

export function saveSystemJson(systemPath: string, json: { [name: string]: any }) {
  const writeContents: any = 'System.config(' + JSON.stringify(json, null, '\t') + ');';
  
  fs.writeFileSync(systemPath, writeContents, 'utf8');
}
