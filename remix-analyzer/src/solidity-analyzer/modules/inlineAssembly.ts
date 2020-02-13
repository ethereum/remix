import { default as category } from './categories'
import { isInlineAssembly } from './staticAnalysisCommon'
import { default as algorithm } from './algorithmCategories'
import { AnalyzerModule, ModuleAlgorithm, ModuleCategory, ReportObj, AstNodeLegacy, CompilationResult} from './../../types'

export default class inlineAssembly implements AnalyzerModule {
  inlineAssNodes: AstNodeLegacy[] = []
  name: string = 'Inline assembly: '
  description: string = 'Use of Inline Assembly'
  category: ModuleCategory = category.SECURITY
  algorithm: ModuleAlgorithm = algorithm.EXACT

  visit (node: AstNodeLegacy): void {
    if (isInlineAssembly(node)) this.inlineAssNodes.push(node)
  }

  report (compilationResults: CompilationResult): ReportObj[] {
    return this.inlineAssNodes.map((node) => {
      return {
        warning: `CAUTION: The Contract uses inline assembly, this is only advised in rare cases. 
                  Additionally static analysis modules do not parse inline Assembly, this can lead to wrong analysis results.`,
        location: node.src,
        more: 'http://solidity.readthedocs.io/en/develop/assembly.html#solidity-assembly'
      }
    })
  }
}
