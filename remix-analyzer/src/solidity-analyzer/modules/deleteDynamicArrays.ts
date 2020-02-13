import { default as category } from './categories'
import { isDeleteOfDynamicArray } from './staticAnalysisCommon'
import { default as algorithm } from './algorithmCategories'
import { AnalyzerModule, ModuleAlgorithm, ModuleCategory, ReportObj, AstNodeLegacy, CompilationResult} from './../../types'

export default class deleteDynamicArrays implements AnalyzerModule {
  rel: AstNodeLegacy[] = []
  name: string = 'Delete on dynamic Array: '
  description: string = 'Use require and appropriately'
  category: ModuleCategory = category.GAS
  algorithm: ModuleAlgorithm = algorithm.EXACT

  visit (node: AstNodeLegacy): void {
    if (isDeleteOfDynamicArray(node)) this.rel.push(node)
  }

  report (compilationResults: CompilationResult): ReportObj[] {
    return this.rel.map((node) => {
      return {
        warning: 'The “delete” operation when applied to a dynamically sized array in Solidity generates code to delete each of the elements contained. If the array is large, this operation can surpass the block gas limit and raise an OOG exception. Also nested dynamically sized objects can produce the same results.',
        location: node.src,
        more: 'http://solidity.readthedocs.io/en/latest/types.html?highlight=array#delete'
      }
    })
  }
}
