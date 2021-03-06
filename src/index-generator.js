'use strict'

const fs = require('fs'),
  path = require('path'),
  babylon = require('babylon'),
  util = require('util'),
  endOfLine = require('os').EOL;

let cache = {},
  includedPathes = [],
  excludePathes = [];

/**
 export { name1, name2, …, nameN };
 export { variable1 as name1, variable2 as name2, …, nameN };
 export let name1, name2, …, nameN; // also var
 export let name1 = …, name2 = …, …, nameN; // also var, const

 export default expression;
 export default function (…) { … } // also class, function*
 export default function name1(…) { … } // also class, function*
 export { name1 as default, … };

 export * from …;
 export { name1, name2, …, nameN } from …;
 export { import1 as name1, import2 as name2, …, nameN } from …;
 */

/**
 *
 * @param filePathToIndex: string
 * @param isEntry: bool
 */
function generate(filePathToIndex, isEntry) {
  isEntry = isEntry == undefined ? true : isEntry;
  if (!shouldBeScanned(filePathToIndex) || isIndex(filePathToIndex))
    return;

  let stat = fs.lstatSync(filePathToIndex);
  let folderPath = stat.isDirectory() ? path.resolve(filePathToIndex) : path.dirname(path.resolve(filePathToIndex));
  let shouldScanDeep = stat.isDirectory() && isEntry;

  fs.readdir(folderPath, (err, files) => {
    let exports = [];

    files.forEach((file) => {
      let filePath = path.join(folderPath, file);

      if (!shouldBeScanned(filePath) || isIndex(file))
        return;

      let stat = fs.lstatSync(filePath);
      if (stat.isDirectory() && shouldScanDeep) {
        generate(filePath, false);
        return;
      }
      if (stat.isFile()) {
        let r = parseFile(filePath);
        exports = exports.concat(r);
      }
    });
    let content = generateExports(exports);
    saveIndex(folderPath, content);
  });
}

function parseFile(content) {
  let exports = [];
  let ast = babylon.parse(content, {
    sourceType: 'module',
    allowImportExportEverywhere: true,
    plugins: [
      'jsx',
      'asyncFunctions',
      'classConstructorCall',
      'doExpressions',
      'trailingFunctionCommas',
      'objectRestSpread',
      'decorators',
      'classProperties',
      'exportExtensions',
      'exponentiationOperator',
      'asyncGenerators',
      'functionBind',
      'functionSent'
    ]
  });

  ast.program.body.forEach((rootItem) => {
    let exprt;

    try {
      if (rootItem.type == 'ExportDefaultDeclaration') {
        exprt = {
          name: rootItem.declaration.id ? rootItem.declaration.id.name : path.basename(filePath, path.extname(filePath)),
          isDefault: true
        };
      } else if (rootItem.type == 'ExportNamedDeclaration') {
        if (rootItem.declaration.type == 'VariableDeclaration') {
          exprt = {
            name: rootItem.declaration.declarations.find(x => x.type == 'VariableDeclarator').id.name
          }
        } else {
          exprt = {
            name: rootItem.declaration.id.name
          }
        }
      }
      if (exprt) {
        exprt.type = rootItem.type;
        exprt.file = path.basename(filePath);
        exports.push(exprt);
      }
    } catch (e) {
      console.log('------------------', filePath, '------------------');
      console.log(e);
      console.log(util.inspect(rootItem, { showHidden: false, depth: null }));
    }
  });
  return exports;
}

function generateExports(exports) {
  let lines = [];
  exports.forEach((exprt) => {
    let text = '';
    if (exprt.type == 'ExportDefaultDeclaration')
      text = `{ default as ${exprt.name} }`;
    else if (exprt.type == 'ExportNamedDeclaration')
      text = `{ ${exprt.name} }`;

    lines.push(`export ${text} from './${exprt.file}';`);
  });

  return lines.join(endOfLine);
}

function saveIndex(folder, content) {
  let indexPath = path.join(folder, 'index.js');
  content = `/* auto-generated by indexer */${endOfLine}/* eslint-disable */${endOfLine}${content}`;

  fs.writeFile(indexPath, content, { encoding: 'utf8' }, (err) => {
    if (err) throw err;
    cache[indexPath] = '';

    let relativeIndexPath = indexPath.substr(path.resolve('.').length);
    console.log(`${relativeIndexPath} saved`);
  });
}

function shouldBeScanned(scanPath) {
  let fullScanPath = path.resolve(scanPath);
  return includedPathes.some((include) => fullScanPath.indexOf(include) > -1)
    && !excludePathes.some((exclude) => fullScanPath.indexOf(exclude) > -1);
}

function isIndex(filePath) {
  let fileName = path.basename(filePath);
  return fileName == 'index.js';
}

function run() {
  includedPathes.forEach((path => {
    generate(path);
  }));
}

function init(include, exclude) {
  includedPathes = include.map(x => path.resolve(x));
  excludePathes = exclude.map(x => path.resolve(x));
}

module.exports = {
  init: init,
  run: run,
  generate: generate
};