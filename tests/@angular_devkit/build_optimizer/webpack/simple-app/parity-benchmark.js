const fs = require('fs');
const path = require('path');


const ngoDir = path.join(__dirname, 'dist');
const oldNgoDir = path.join(__dirname, 'dist-old-ngo');

const ngoSizes = {};
const oldNgoSizes = {};
const fileSize = (filename, hash) => hash[filename] = fs.statSync(filename).size;
const sizeDiff = (oldSize, newSize) => Math.round(((newSize - oldSize) / oldSize) * 10000) / 100;

fs.readdirSync(ngoDir).forEach((file) => fileSize(path.join(ngoDir, file), ngoSizes))
fs.readdirSync(oldNgoDir).forEach((file) => fileSize(path.join(oldNgoDir, file), oldNgoSizes))

let ngoTotal = 0;
let oldNgoTotal = 0;
let ngoGzTotal = 0;
let oldNgoGzTotal = 0;

console.log('');
console.log('simple-app parity benchmark:');
console.log('');

Object.keys(ngoSizes)
  .filter((filename) => filename.endsWith('.js'))
  .forEach((filename) => {
    const name = path.basename(filename);

    const ngo = ngoSizes[filename];
    const oldNgo = oldNgoSizes[path.join(oldNgoDir, name)];
    const diff = sizeDiff(oldNgo, ngo);

    const ngoGz = ngoSizes[`${filename}.gz`];
    const oldNgoGz = oldNgoSizes[path.join(oldNgoDir, `${name}.gz`)];
    const diffGz = sizeDiff(oldNgoGz, ngoGz);

    ngoTotal += ngo;
    oldNgoTotal += oldNgo;
    ngoGzTotal += ngoGz;
    oldNgoGzTotal += oldNgoGz;

    console.log(`${name}: ${oldNgo} -> ${ngo} bytes (${diff}%), ${oldNgoGz} -> ${ngoGz} bytes gzipped (${diffGz}%)`);
  });

const diffTotal = sizeDiff(oldNgoTotal, ngoTotal);
const diffGzTotal = sizeDiff(oldNgoGzTotal, ngoGzTotal);

console.log(`Total: ${oldNgoTotal} -> ${ngoTotal} bytes (${diffTotal}%), ${oldNgoGzTotal} -> ${ngoGzTotal} bytes gzipped (${diffGzTotal}%)`);

if (diffTotal > 2) {
  console.log('');
  throw new Error('Total size difference is positive and more than 2%, new ngo performed worse than old ngo.');
}

console.log('');
