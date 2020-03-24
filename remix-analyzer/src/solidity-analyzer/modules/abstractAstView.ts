import { getStateVariableDeclarationsFromContractNode, getInheritsFromName, getContractName,
  getFunctionOrModifierDefinitionParameterPart, getType, getDeclaredVariableName, getFunctionDefinitionReturnParameterPart } from './staticAnalysisCommon'
import { AstWalker } from 'remix-astwalker'
import { FunctionDefinitionAstNode, ParameterListAstNode, ModifierDefinitionAstNode, ContractHLAst, VariableDeclarationAstNode, 
  FunctionHLAst, ReportObj, ReportFunction, VisitFunction, ModifierHLAst, CompilationResult } from 'types'

type WrapFunction = ((contracts: ContractHLAst[], isSameName: boolean) => ReportObj[])

export default class abstractAstView {
  contracts: ContractHLAst[] = []
  currentContractIndex: number = -1
  currentFunctionIndex: number = -1
  currentModifierIndex: number = -1
  isFunctionNotModifier: boolean = false
  /*
    file1: contract c{}
    file2: import "file1" as x; contract c{}
    therefore we have two contracts with the same name c. At the moment this is not handled because alias name "x" is not
    available in the current AST implementation thus can not be resolved.
    Additionally the fullQuallified function names e.g. [contractName].[functionName](param1Type, param2Type, ... ) must be prefixed to
    fully support this and when inheritance is resolved it must include alias resolving e.g x.c = file1.c
  */
  multipleContractsWithSameName: boolean = false

/**
 * Builds a higher level AST view. I creates a list with each contract as an object in it.
 * Example contractsOut:
 *
 * {
 *  "node": {},                     // actual AST Node of the contract
 *  "functions": [
 *    {
 *      "node": {},                // actual AST Node of the function
 *      "relevantNodes": [],       // AST nodes in the function that are relevant for the anlysis of this function
 *      "modifierInvocations": [], // Modifier invocation AST nodes that are applied on this function
 *      "localVariables": [],      // Local variable declaration nodes
 *      "parameters": []           // Parameter types of the function in order of definition
 *      "returns": []              // list of return vars as { type: ... , name: ... }
 *    }
 *  ],
 *  "modifiers": [],              // Modifiers definded by the contract, format similar to functions
 *  "inheritsFrom": [],           // Names of contract this one inherits from in order of definition
 *  "stateVariables": []          // AST nodes of all State variables
 * }
 *
 * @relevantNodeFilter {ASTNode -> bool} function that selects relevant ast nodes for analysis on function level.
 * @contractsOut {list} return list for high level AST view
 * @return {ASTNode -> void} returns a function that can be used as visit function for static analysis modules, to build up a higher level AST view for further analysis.
 */
  build_visit (relevantNodeFilter: ((node:any) => boolean)): VisitFunction {
    return (node: any) => {
      if (node.nodeType === "ContractDefinition") {
        this.setCurrentContract({
          node: node,
          functions: [],
          relevantNodes: [],
          modifiers: [],
          inheritsFrom: [],
          stateVariables: getStateVariableDeclarationsFromContractNode(node)
        })
      } else if (node.nodeType === "InheritanceSpecifier") {
        const currentContract: ContractHLAst = this.getCurrentContract()
        const inheritsFromName: string = getInheritsFromName(node)
        currentContract.inheritsFrom.push(inheritsFromName)
      } else if (node.nodeType === "FunctionDefinition") {
        this.setCurrentFunction({
          node: node,
          relevantNodes: [],
          modifierInvocations: [],
          localVariables: this.getLocalVariables(node),
          parameters: this.getLocalParameters(node),
          returns: this.getReturnParameters(node)
        })
        // push back relevant nodes to their the current fn if any
        this.getCurrentContract().relevantNodes.map((item) => {
          if (item.referencedDeclaration === node.id) {
            this.getCurrentFunction().relevantNodes.push(item.node)
          }
        })
      } else if (node.nodeType === "ModifierDefinition") {
        this.setCurrentModifier({
          node: node,
          relevantNodes: [],
          localVariables: this.getLocalVariables(node),
          parameters: this.getLocalParameters(node)
        })
      } else if (node.nodeType === "ModifierInvocation") {
        if (!this.isFunctionNotModifier) throw new Error('abstractAstView.js: Found modifier invocation outside of function scope.')
        this.getCurrentFunction().modifierInvocations.push(node)
      } else if (relevantNodeFilter(node)) {
        let scope: FunctionHLAst | ModifierHLAst | ContractHLAst = (this.isFunctionNotModifier) ? this.getCurrentFunction() : this.getCurrentModifier()
        if (scope) {
          scope.relevantNodes.push(node)
        } else {
          scope = this.getCurrentContract() // if we are not in a function scope, add the node to the contract scope
          if (scope && node.referencedDeclaration) {
            scope.relevantNodes.push({ referencedDeclaration: node.referencedDeclaration, node: node })
          }
        }
      }
    }
  }

  build_report (wrap: WrapFunction): ReportFunction {
    return (compilationResult: CompilationResult) => {
      this.resolveStateVariablesInHierarchy(this.contracts)
      return wrap(this.contracts, this.multipleContractsWithSameName)
    }
  }

  private resolveStateVariablesInHierarchy (contracts: ContractHLAst[]): void {
    contracts.map((c: ContractHLAst) => {
      this.resolveStateVariablesInHierarchyForContract(c, contracts)
    })
  }

  private resolveStateVariablesInHierarchyForContract (currentContract: ContractHLAst, contracts: ContractHLAst[]): void {
    currentContract.inheritsFrom.map((inheritsFromName: string) => {
      // add variables from inherited contracts
      const inheritsFrom: ContractHLAst | undefined = contracts.find((contract: ContractHLAst) => getContractName(contract.node) === inheritsFromName)
      if (inheritsFrom) {
        currentContract.stateVariables = currentContract.stateVariables.concat(inheritsFrom.stateVariables)
      } else {
        console.log('abstractAstView.js: could not find contract defintion inherited from ' + inheritsFromName)
      }
    })
  }

  private setCurrentContract (contract: ContractHLAst): void {
    const name: string = getContractName(contract.node)
    if (this.contracts.map((c: ContractHLAst) => getContractName(c.node)).filter((n) => n === name).length > 0) {
      console.log('abstractAstView.js: two or more contracts with the same name dectected, import aliases not supported at the moment')
      this.multipleContractsWithSameName = true
    }
    this.currentContractIndex = (this.contracts.push(contract) - 1)
  }

  private setCurrentFunction (func: FunctionHLAst): void {
    this.isFunctionNotModifier = true
    this.currentFunctionIndex = (this.getCurrentContract().functions.push(func) - 1)
  }

  private setCurrentModifier (modi): void {
    this.isFunctionNotModifier = false
    this.currentModifierIndex = (this.getCurrentContract().modifiers.push(modi) - 1)
  }

  private getCurrentContract (): ContractHLAst {
    return this.contracts[this.currentContractIndex]
  }

  private getCurrentFunction (): FunctionHLAst {
    return this.getCurrentContract().functions[this.currentFunctionIndex]
  }

  private getCurrentModifier (): ModifierHLAst {
    return this.getCurrentContract().modifiers[this.currentModifierIndex]
  }

  private getLocalParameters (funcNode: FunctionDefinitionAstNode | ModifierDefinitionAstNode): string[] {
    return getFunctionOrModifierDefinitionParameterPart(funcNode).parameters.map(getType)
  }

  private getReturnParameters (funcNode: FunctionDefinitionAstNode): Record<string, string>[] {
    return this.getLocalVariables(getFunctionDefinitionReturnParameterPart(funcNode)).map((n: VariableDeclarationAstNode) => {
      return {
        type: getType(n),
        name: getDeclaredVariableName(n)
      }
    })
  }

  private getLocalVariables (funcNode: ParameterListAstNode): VariableDeclarationAstNode[] {
    const locals: VariableDeclarationAstNode[] = []
    new AstWalker().walkFull(funcNode, (node: any) => {
      if (node.nodeType === "VariableDeclaration") locals.push(node)
      return true
    })
    return locals
  }
}
