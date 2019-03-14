import tape from 'tape'
import { AstWalker, AstNode } from '../src/'
import node from './resources/ast'

tape("ASTWalker", (t: tape.Test) => {
  t.test('ASTWalker.walk', (st: tape.Test) => {
    st.plan(23)
    const astWalker = new AstWalker()
    astWalker.on('node', node => {
      if(node.name === 'ContractDefinition') {
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
    astWalker.walk(node.ast.legacyAST, (children)=> {
      console.log(children)
    
      return true;
    })
    st.end()
  })
});

function checkContract (st: tape.Test, node: AstNode) {
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

function checkSetFunction (st: tape.Test, node: AstNode) {
  if (node.attributes.name === 'set') {
    st.equal(node.children[0].name, 'ParameterList')
    st.equal(node.children[1].name, 'ParameterList')
    st.equal(node.children[2].name, 'Block')
    st.equal(node.children[2].children[1].name, 'ExpressionStatement')
    checkExpressionStatement(st, node.children[2].children[0])
  }
}

function checkGetFunction (st: tape.Test, node: AstNode) {
  if (node.attributes.name === 'get') {
    st.equal(node.children[0].name, 'ParameterList')
    st.equal(node.children[1].name, 'ParameterList')
    st.equal(node.children[2].name, 'Block')
  }
}

function checkExpressionStatement (st: tape.Test, node: AstNode) {
  st.equal(node.children[0].name, 'Assignment')
  st.equal(node.children[0].attributes.operator, '=')
  st.equal(node.children[0].attributes.type, 'int256')
  st.equal(node.children[0].children[0].name, 'Identifier')
  st.equal(node.children[0].children[0].attributes.value, 'x')
  st.equal(node.children[0].children[1].name, 'Identifier')
  st.equal(node.children[0].children[1].attributes.value, '_x')
}
