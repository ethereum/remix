'use strict'
import { AstWalker } from 'remix-astwalker'
import list from './modules/list'
import { CompilationResult, AnalyzerModule, AnalysisReportObj, AnalysisReport } from 'types'

type ModuleObj = {
  name: string
  mod: AnalyzerModule
}

export default class staticAnalysisRunner {

  /**
   * Run analysis (Used by IDE)
   * @param compilationResult contract compilation result
   * @param toRun module indexes (compiled from remix IDE)
   * @param callback callback
   */
  run (compilationResult: CompilationResult, toRun: number[], callback: ((reports: AnalysisReport[]) => void)): void {
    const modules: ModuleObj[] = toRun.map((i) => {
      const m: AnalyzerModule = this.modules()[i]
      return { 'name': m.name, 'mod': m }
    })
    this.runWithModuleList(compilationResult, modules, callback)
  }

  /**
   * Run analysis passing list of modules to run
   * @param compilationResult contract compilation result
   * @param modules analysis module
   * @param callback callback
   */
  runWithModuleList (compilationResult: CompilationResult, modules: ModuleObj[], callback: ((reports: AnalysisReport[]) => void)): void {
    let reports: AnalysisReport[] = []
    // Also provide convenience analysis via the AST walker.
    const walker = new AstWalker()
    for (let k in compilationResult.sources) {
      walker.walkFull(compilationResult.sources[k].ast, 
        (node: any) => {
        modules.map((item: ModuleObj) => {
          if (item.mod.visit !== undefined) {
            try {
              item.mod.visit(node)
            } catch (e) {
              reports.push({
                name: item.name, report: [{ warning: 'INTERNAL ERROR in module ' + item.name + ' ' + e.message, error: e.stack }]
              })
            }
          }
        })
        return true
      }
      )
    }

    // Here, modules can just collect the results from the AST walk,
    // but also perform new analysis.
    reports = reports.concat(modules.map((item: ModuleObj) => {
      let report: AnalysisReportObj[] | null = null
      try {
        report = item.mod.report(compilationResult)
      } catch (e) {
        report = [{ warning: 'INTERNAL ERROR in module ' + item.name + ' ' + e.message, error: e.stack }]
      }
      return { name: item.name, report: report }
    }))
    callback(reports)
  }

  /**
   * Get list of all analysis modules
   */
  modules (): any[] {
    return list
  }
}
