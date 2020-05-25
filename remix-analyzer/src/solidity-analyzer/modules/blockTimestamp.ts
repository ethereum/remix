import { default as category } from './categories'
import { isNowAccess, isBlockTimestampAccess } from './staticAnalysisCommon'
import { default as algorithm } from './algorithmCategories'
import { AnalyzerModule, ModuleAlgorithm, ModuleCategory, ReportObj, CompilationResult, IdentifierAstNode, 
  MemberAccessAstNode} from './../../types'

export default class blockTimestamp implements AnalyzerModule {
  warningNowNodes: IdentifierAstNode[] = []
  warningblockTimestampNodes: MemberAccessAstNode[] = []
  name: string = `Block timestamp: `
  description: string = `Can be influenced by miners`
  category: ModuleCategory = category.SECURITY
  algorithm: ModuleAlgorithm = algorithm.EXACT

  visit (node: IdentifierAstNode | MemberAccessAstNode ): void {
    if (node.nodeType === "Identifier" && isNowAccess(node)) this.warningNowNodes.push(node)
    else if (node.nodeType === "MemberAccess" && isBlockTimestampAccess(node)) this.warningblockTimestampNodes.push(node)
  }

  report (compilationResults: CompilationResult): ReportObj[] {
    return this.warningNowNodes.map((item, i) => {
      return {
        warning: `use of "now": "now" does not mean current time. Now is an alias for block.timestamp. 
                  Block.timestamp can be influenced by miners to a certain degree, be careful.`,
        location: item.src,
        more: 'https://solidity.readthedocs.io/en/develop/units-and-global-variables.html?highlight=block.timestamp#block-and-transaction-properties'
      }
    }).concat(this.warningblockTimestampNodes.map((item, i) => {
      return {
        warning: `use of "block.timestamp": "block.timestamp" can be influenced by miners to a certain degree. 
                  That means that a miner can "choose" the block.timestamp, to a certain degree, to change the outcome of a transaction in the mined block.`,
        location: item.src,
        more: 'https://solidity.readthedocs.io/en/develop/units-and-global-variables.html?highlight=block.timestamp#block-and-transaction-properties'
      }
    }))
  }
}
