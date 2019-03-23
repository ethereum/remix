import tape from 'tape'
import { AstWalker, AstNode } from '../src/'
import node from './resources/ast'
import newNode from './resources/newAST'
import { strict } from 'assert';
import { ast } from '../../remix-lib/test/resources/ast';

tape("ASTWalker", (t: tape.Test) => {
  t.test('ASTWalker.walk', (st: tape.Test) => {
    st.plan(50)
    // New Ast Object
    const astWalker = new AstWalker()
    // EventListener
    astWalker.on('node', node => {
      if (node.name === 'ContractDefinition') {
        checkContract(st, node)
      }
      if (node.name === 'FunctionDefinition') {
        checkSetFunction(st, node)
        checkGetFunction(st, node)
      }
      if (node.name === 'VariableDeclaration') {
        checkSetFunction(st, node)
        checkGetFunction(st, node)
      }
    })

    // Callback pattern
    astWalker.walk(node.ast.legacyAST, (node) => {
      if (node.name === 'ContractDefinition') {
        checkContract(st, node)
      }
      if (node.name === 'FunctionDefinition') {
        checkSetFunction(st, node)
        checkGetFunction(st, node)
      }
      if (node.name === 'VariableDeclaration') {
        checkSetFunction(st, node)
        checkGetFunction(st, node)
      }
    })

    // Callback Object
    var callback: any = {};
    callback.FunctionDefinition = function(node): boolean {
      st.equal(node.name, 'FunctionDefinition')
      st.equal(node.attributes.name === 'set' || node.attributes.name === 'get', true)
      return true
    }
    // Calling walk function with cb
    astWalker.walk(node.ast.legacyAST, callback)

    // Calling walk function without cb
    astWalker.walk(node.ast.legacyAST)

    // Calling WALKASTLIST function
    astWalker.walkAstList(node)
    // Calling walkASTList with new AST format
    astWalker.walkAstList(newNode)

    // Calling WALKASTLIST function with cb
    astWalker.walkAstList(node, (node) => {
      return true;
    })
    st.end()
  })
});

function checkContract(st: tape.Test, node: AstNode) {
  st.equal(node.attributes.name, 'test')
  st.equal(node.children[0].attributes.name, 'x')
  st.equal(node.children[0].attributes.type, 'int256')
  st.equal(node.children[1].attributes.name, 'y')
  st.equal(node.children[1].attributes.type, 'int256')
  st.equal(node.children[2].name, 'FunctionDefinition')
  st.equal(node.children[2].attributes.constant, false)
  st.equal(node.children[2].attributes.name, 'set')
  st.equal(node.children[2].attributes.public, true)
}

function checkSetFunction(st: tape.Test, node: AstNode) {
  if (node.attributes.name === 'set') {
    st.equal(node.children[0].name, 'ParameterList')
    st.equal(node.children[1].name, 'ParameterList')
    st.equal(node.children[2].name, 'Block')
    st.equal(node.children[2].children[1].name, 'ExpressionStatement')
    checkExpressionStatement(st, node.children[2].children[0])
  }
}

function checkGetFunction(st: tape.Test, node: AstNode) {
  if (node.attributes.name === 'get') {
    st.equal(node.children[0].name, 'ParameterList')
    st.equal(node.children[1].name, 'ParameterList')
    st.equal(node.children[2].name, 'Block')
  }
}

function checkExpressionStatement(st: tape.Test, node: AstNode) {
  st.equal(node.children[0].name, 'Assignment')
  st.equal(node.children[0].attributes.operator, '=')
  st.equal(node.children[0].attributes.type, 'int256')
  st.equal(node.children[0].children[0].name, 'Identifier')
  st.equal(node.children[0].children[0].attributes.value, 'x')
  st.equal(node.children[0].children[1].name, 'Identifier')
  st.equal(node.children[0].children[1].attributes.value, '_x')
}
