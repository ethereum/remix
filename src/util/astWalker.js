'use strict'
/*
  Crawl the given AST through the function walk(ast, callback)
*/
function AstWalker () {
}
/*
    * visit all the AST nodes
    *
    * @param {Object} ast  - AST node
    * @param {Object or Function} callback  - if (Function) the function will be called for every node.
    *                                       - if (Object) callback[<Node Type>] will be called for every node of type <Node Type>. callback["*"] will be called fo all other nodes.
    *                                     in each case, if the callback returns false it does not descend into children. If no callback for the current type, children are visited.
*/
AstWalker.prototype.walk = function (ast, callback) {
  crawlNode(ast, callback)
}

function crawlNode (node, callback) {
  if (manageCallBack(node, callback) && node.children && node.children.length > 0) {
    for (var k in node.children) {
      var child = node.children[k]
      crawlNode(child, callback)
    }
  }
}

function manageCallBack (node, callback) {
  if (callback instanceof Function) {
    return callback(null, node)
  } else if (callback instanceof Object) {
    if (callback[node.name] instanceof 'Function') {
      return callback[node.name](null, node)
    } else if (callback['*'] instanceof 'Function') {
      return callback['*'](null, node)
    } else {
      return true
    }
  }
}
