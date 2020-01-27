import async, { ErrorCallback } from 'async'
require('colors')

import { compileContractSources } from './compiler'
import { deployAll } from './deployer'
import { runTest } from './testRunner'

import Web3 from 'web3';
import { Provider } from 'remix-simulator'
import { FinalResult, SrcIfc, compilationInterface, ASTInterface, Options, 
    TestResultInterface, AstNode, CompilerConfiguration } from './types'

const createWeb3Provider = async function () {
    let web3 = new Web3()
    let provider = new Provider()
    await provider.init()
    web3.setProvider(provider)
    return web3
}

/**
 * @dev Run tests from source of a test contract file (used for IDE)
 * @param contractSources Sources of contract
 * @param compilerConfig current compiler configuration
 * @param testCallback Test callback
 * @param resultCallback Result Callback
 * @param finalCallback Final Callback
 * @param importFileCb Import file callback
 * @param opts Options
 */
export async function runTestSources(contractSources: SrcIfc, compilerConfig: CompilerConfiguration, testCallback: Function, resultCallback: Function, finalCallback: any, importFileCb: Function, opts: Options) {
    opts = opts || {}
    const sourceASTs: any = {}
    let web3 = opts.web3 || await createWeb3Provider()
    let accounts: string[] | null = opts.accounts || null
    async.waterfall([
        function getAccountList (next) {
            if (accounts) return next()
            web3.eth.getAccounts((_err, _accounts) => {
                accounts = _accounts
                next()
            })
        },
        function compile (next) {
            compileContractSources(contractSources, compilerConfig, importFileCb, { accounts }, next)
        },
        function deployAllContracts (compilationResult: compilationInterface, asts: ASTInterface, next) {
            for(const filename in asts) {
                if(filename.endsWith('_test.sol'))
                    sourceASTs[filename] = asts[filename].ast
            }
            deployAll(compilationResult, web3, false, (err, contracts) => {
                if (err) {
                    // If contract deployment fails because of 'Out of Gas' error, try again with double gas
                    // This is temporary, should be removed when remix-tests will have a dedicated UI to 
                    // accept deployment params from UI
                    if(err.message.includes('The contract code couldn\'t be stored, please check your gas limit')) {
                        deployAll(compilationResult, web3, true, (error, contracts) => {
                            if (error) next([{message: 'contract deployment failed after trying twice: ' + error.message, severity: 'error'}]) // IDE expects errors in array
                            else next(null, compilationResult, contracts)
                        })
                    } else
                        next([{message: 'contract deployment failed: ' + err.message, severity: 'error'}]) // IDE expects errors in array
                } else
                next(null, compilationResult, contracts)
            })
        },
        function determineTestContractsToRun (compilationResult: compilationInterface, contracts: any, next) {
            let contractsToTest: string[] = []
            let contractsToTestDetails: any[] = []

            for (let filename in compilationResult) {
                if (!filename.endsWith('_test.sol')) {
                    continue
                }
                Object.keys(compilationResult[filename]).forEach(contractName => {
                    contractsToTestDetails.push(compilationResult[filename][contractName])
                    contractsToTest.push(contractName)
                })
            }
            next(null, contractsToTest, contractsToTestDetails, contracts)
        },
        function runTests(contractsToTest: string[], contractsToTestDetails: any[], contracts: any, next) {
            let totalPassing = 0
            let totalFailing = 0
            let totalTime = 0
            let errors: any[] = []

            const _testCallback = function (err: Error | null | undefined, result: TestResultInterface) {
                if (result.type === 'testFailure') {
                    errors.push(result)
                }
                testCallback(result)
            }

            const _resultsCallback = function (_err, result, cb) {
                resultCallback(_err, result, () => {})
                totalPassing += result.passingNum
                totalFailing += result.failureNum
                totalTime += result.timePassed
                cb()
            }

            async.eachOfLimit(contractsToTest, 1, (contractName: string, index: string | number, cb: ErrorCallback) => {
                const fileAST: AstNode = sourceASTs[contracts[contractName]['filename']]
                runTest(contractName, contracts[contractName], contractsToTestDetails[index], fileAST, { accounts }, _testCallback, (err, result) => {
                    if (err) {
                        return cb(err)
                    }
                    _resultsCallback(null, result, cb)
                })
            }, function (err) {
                if (err) {
                    return next(err)
                }

                let finalResults: FinalResult = {
                    totalPassing: 0,
                    totalFailing: 0,
                    totalTime: 0,
                    errors: [],
                }

                finalResults.totalPassing = totalPassing || 0
                finalResults.totalFailing = totalFailing || 0
                finalResults.totalTime = totalTime || 0
                finalResults.errors = []

                errors.forEach((error, _index) => {
                    finalResults.errors.push({context: error.context, value: error.value, message: error.errMsg})
                })

                next(null, finalResults)
            })
        }
    ], finalCallback)
}
