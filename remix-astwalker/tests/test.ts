import * as tape from 'tape'
import { AstWalker, Node } from '../src/'
import node from './resources/ast'

tape('ASTWalker', (t) => {
  t.test('ASTWalker.walk', (st) => {
    st.plan(24)
    let astwalker = new AstWalker()
    console.log("Walking test")
    astwalker.walk(node.ast.legacyAST)
    astwalker.on('node', node => {
      console.log(node)
    })
    st.true(5 > 2 + 2);
    st.ok("Tested Ok")
  })
})
