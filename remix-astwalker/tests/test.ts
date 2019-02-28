import tape from 'tape'
import { AstWalker, Node, AstNode } from '../src/'
import node from './resources/ast'

tape("ASTWalker", (t: tape.Test) => {
  t.test('ASTWalker.walk', (st: tape.Test) => {
    st.plan(9)
    const astWalker = new AstWalker()
    astWalker.on('node', node => {
      if(node.name === 'ContractDefinition') {
        checkContract(st, node)
      }
    })
    astWalker.walk(node.ast.legacyAST)
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
