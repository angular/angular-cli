const fs = require('fs');
const path = require('path');


const ngoDir = path.join(__dirname, 'dist');
const noNgoDir = path.join(__dirname, 'dist-no-ngo');

const ngoSizes = {};
const noNgoSizes = {};
const fileSize = (filename, hash) => hash[filename] = fs.statSync(filename).size;
const sizeDiff = (oldSize, newSize) => Math.round(((newSize - oldSize) / oldSize) * 10000) / 100;

fs.readdirSync(ngoDir).forEach((file) => fileSize(path.join(ngoDir, file), ngoSizes))
fs.readdirSync(noNgoDir).forEach((file) => fileSize(path.join(noNgoDir, file), noNgoSizes))

let ngoTotal = 0;
let noNgoTotal = 0;
let ngoGzTotal = 0;
let noNgoGzTotal = 0;

console.log('');
console.log('aio-app size benchmark:');
console.log('');

Object.keys(ngoSizes)
  .filter((filename) => filename.endsWith('.js'))
  .forEach((filename) => {
    const name = path.basename(filename);

    const ngo = ngoSizes[filename];
    const noNgo = noNgoSizes[path.join(noNgoDir, name)];
    const diff = sizeDiff(noNgo, ngo);

    const ngoGz = ngoSizes[`${filename}.gz`];
    const noNgoGz = noNgoSizes[path.join(noNgoDir, `${name}.gz`)];
    const diffGz = sizeDiff(noNgoGz, ngoGz);

    ngoTotal += ngo;
    noNgoTotal += noNgo;
    ngoGzTotal += ngoGz;
    noNgoGzTotal += noNgoGz;

    console.log(`${name}: ${noNgo} -> ${ngo} bytes (${diff}%), ${noNgoGz} -> ${ngoGz} bytes gzipped (${diffGz}%)`);
  });

const diffTotal = sizeDiff(noNgoTotal, ngoTotal);
const diffGzTotal = sizeDiff(noNgoGzTotal, ngoGzTotal);

console.log(`Total: ${noNgoTotal} -> ${ngoTotal} bytes (${diffTotal}%), ${noNgoGzTotal} -> ${ngoGzTotal} bytes gzipped (${diffGzTotal}%)`);

if (diffTotal > -1 && diffTotal < 0) {
  console.log('');
  throw new Error('Total size difference is too small, ngo does not seem to have made any optimizations.');
}

if (diffTotal > 1) {
  console.log('');
  throw new Error('Total size difference is positive, ngo made the bundle bigger.');
}

console.log('');
