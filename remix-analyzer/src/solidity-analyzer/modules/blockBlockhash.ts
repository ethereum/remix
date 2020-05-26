import { default as category } from './categories'
import { isBlockBlockHashAccess } from './staticAnalysisCommon'
import { default as algorithm } from './algorithmCategories'
import { AnalyzerModule, ModuleAlgorithm, ModuleCategory, ReportObj, CompilationResult, FunctionCallAstNode, SupportedVersion} from './../../types'

export default class blockBlockhash implements AnalyzerModule {
  warningNodes: FunctionCallAstNode[] = []
  name: string = `Block hash: `
  description: string = `Can be influenced by miners`
  category: ModuleCategory = category.SECURITY
  algorithm: ModuleAlgorithm = algorithm.EXACT
  version: SupportedVersion = {
    start: '0.4.12'
  }

  visit (node: FunctionCallAstNode): void {
    if (node.nodeType === 'FunctionCall' && isBlockBlockHashAccess(node)) this.warningNodes.push(node)
  }

  report (compilationResults: CompilationResult): ReportObj[] {
    return this.warningNodes.map((item, i) => {
      return {
        warning: `Use of "blockhash": "blockhash(uint blockNumber)" is used to access the last 256 block hashes. 
                  A miner computes the block hash by "summing up" the information in the current block mined. 
                  By "summing up" the information cleverly, a miner can try to influence the outcome of a transaction in the current block. 
                  This is especially easy if there are only a small number of equally likely outcomes.`,
        location: item.src
      }
    })
  }
}

