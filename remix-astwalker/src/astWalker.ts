import { EventEmitter } from 'events'
import { AstNode } from 'index'
export declare interface AstWalker {
  new(): EventEmitter;
}
/**
 * Crawl the given AST through the function walk(ast, callback)
 */
 /**
  * visit all the AST nodes
  *
  * @param {Object} ast  - AST node
  * @return EventEmitter
  * event('node', <Node Type | false>) will be fired for every node of type <Node Type>.
  * event('node', "*") will be fired for all other nodes.
  * in each case, if the event emits false it does not descend into children.
  * If no event for the current type, children are visited.
  */
export class AstWalker extends EventEmitter {
   walk(ast: AstNode) {
     //this.emit('node', ast);
     for(let k in ast.children) {
       let child = ast.children[k];
       this.emit('node', child);
       this.walk(child);
     }
   }
   walkAstList(sourcesList) {
     for (var k in sourcesList) {
       this.walk(sourcesList[k].legacyAST)
     }
   }
}
