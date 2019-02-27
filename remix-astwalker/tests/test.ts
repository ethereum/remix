import tape from 'tape'
import { AstWalker, Node } from '../src/'
import node from './resources/ast'

tape("ASTWalker", (t: tape.Test) => {
  t.test('ASTWalker.walk', (st) => {
    st.plan(1)
    const astWalker = new AstWalker()
    console.log("Hello test logging")
    astWalker.walk(node.ast)
    astWalker.on('node', node => {
      console.log(node)
    })
    st.end()
  })
});
