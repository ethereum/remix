import { EventEmitter } from "events";
import { AstNode, Node, AstNodeAtt } from "index";
export declare interface AstWalker {
  new (): EventEmitter;
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
  manageCallback(node: AstNode, callback: Object | Function): any {
    if (node.name in callback) {
      return callback[node.name](node);
    } else {
      return callback["*"](node);
    }
  }
  walk(ast: AstNode, callback?: Function | Object) {
    if (callback) {
      if (callback instanceof Function) {
        callback = Object({ "*": callback });
      }
      if (!("*" in callback)) {
        callback["*"] = function() {
          return true;
        };
      }
      if (
        this.manageCallback(ast, callback) &&
        ast.children &&
        ast.children.length > 0
      ) {
        for (let k in ast.children) {
          let child = ast.children[k];
          this.walk(child, callback);
        }
      }
    } else {
      if (ast.children && ast.children.length > 0) {
        for (let k in ast.children) {
          let child = ast.children[k];
          this.emit("node", child);
          this.walk(child);
        }
      }
    }
  }
  walkAstList(sourcesList: Node, cb?: Function) {
    if (cb) {
        this.walk(sourcesList.ast.legacyAST, cb);
      
    } else {
      this.walk(sourcesList.ast.legacyAST);
      
    }
  }
}
