import { EventEmitter } from 'events'
export declare interface AstWalker {
  new(): EventEmitter;
}
/**
 * Crawl the given AST through the function walk(ast, callback)
 */
export class AstWalker extends EventEmitter {
  /**
   * visit all the AST nodes
   *
   * @param {Object} ast  - AST node
   * @param {Object or Function} callback  - if (Function) the function will be called for every node.
   *                                       - if (Object) callback[<Node Type>] will be called for
   *                                         every node of type <Node Type>. callback["*"] will be called fo all other nodes.
   *                                         in each case, if the callback returns false it does not descend into children.
   *                                         If no callback for the current type, children are visited.
   */
   walk(ast) {
     for(let k in ast.children) {
       let child = ast.children[k];
       this.walk(child);
     }
   }
   walkAstList(sourcesList) {
     for (var k in sourcesList) {
       this.walk(sourcesList[k].legacyAST)
     }
   }
}
