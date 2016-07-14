'use strict';

let indexer = require('../src/index-generator');

describe('default', function() {
  it('should export default named function', function() {
    let code = `export default function namedFunction() {
      return '11.22.63';
    }`;
    let exprts =  indexer.parseCode()
  })
});

/*let code = `export default function* namedGenerator() {
  return '11.22.63';
}`;

let code = `export default class namedClass {
}`;

let code = `const namedConst = '11.22.63';
export default namedConst;`;

let code = `var namedVar = '11.22.63';
export default namedVar;`;

let code = `let namedLet = '11.22.63';
export default namedLet;`;

let code = `let namedLetAs = '11.22.63';
export { namedLetAs as default }`;*/