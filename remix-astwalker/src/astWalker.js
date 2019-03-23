"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var events_1 = require("events");
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
var AstWalker = /** @class */ (function (_super) {
    __extends(AstWalker, _super);
    function AstWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AstWalker.prototype.manageCallback = function (node, callback) {
        if (node) {
            if (node.name in callback) {
                return callback[node.name](node);
            }
            else {
                return callback["*"](node);
            }
        }
        if (node) {
            if (node.nodeType in callback) {
                return callback[node.nodeType](node);
            }
            else {
                return callback["*"](node);
            }
        }
    };
    AstWalker.prototype.walk = function (ast, callback) {
        if (callback) {
            if (callback instanceof Function) {
                callback = Object({ "*": callback });
            }
            if (!("*" in callback)) {
                callback["*"] = function () {
                    return true;
                };
            }
            if (ast) {
                if (this.manageCallback(ast, callback) &&
                    ast.children &&
                    ast.children.length > 0) {
                    for (var k in ast.children) {
                        var child = ast.children[k];
                        this.walk(child, callback);
                    }
                }
            }
            if (ast) {
                if (this.manageCallback(ast, callback) &&
                    ast.nodes &&
                    ast.nodes.length > 0) {
                    for (var k in ast.nodes) {
                        var child = ast.nodes[k];
                        this.walk(child, callback);
                    }
                }
            }
        }
        else {
            if (ast) {
                if (ast.children &&
                    ast.children.length > 0) {
                    for (var k in ast.children) {
                        var child = ast.children[k];
                        this.emit("node", child);
                        this.walk(child);
                    }
                }
            }
            else {
                if (ast.nodes && ast.nodes.length > 0) {
                    for (var k in ast.nodes) {
                        var child = ast.nodes[k];
                        this.emit("node", child);
                        this.walk(child);
                    }
                }
            }
        }
    };
    AstWalker.prototype.walkAstList = function (sourcesList, cb) {
        if (cb) {
            if (sourcesList.ast) {
                this.walk(sourcesList.ast, cb);
            }
            else {
                this.walk(sourcesList.legacyAST, cb);
            }
        }
        else {
            if (sourcesList.ast) {
                this.walk(sourcesList.ast);
            }
            else {
                this.walk(sourcesList.legacyAST);
            }
        }
    };
    return AstWalker;
}(events_1.EventEmitter));
exports.AstWalker = AstWalker;
