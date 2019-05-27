var name = 'Delete on dynamic Array: '
var desc = 'Use require and appropriately'
var categories = require('./categories')
var common = require('./staticAnalysisCommon')
var algo = require('./algorithmCategories')

function deleteDynamicArrays () {
  this.rel = []
}

deleteDynamicArrays.prototype.visit = function (node) {
  if (common.isDeleteOfDynamicArray(node)) this.rel.push(node)
}

deleteDynamicArrays.prototype.report = function (compilationResults) {
  return this.rel.map((node) => {
    return {
      warning: 'The “delete” operation when applied to a dynamically sized array in Solidity generates code to delete each of the elements contained. If the array is large, this operation can surpass the block gas limit and raise an OOG exception. Also nested dynamically sized objects can produce the same results.',
      location: node.src,
      more: 'http://solidity.readthedocs.io/en/latest/types.html?highlight=array#delete'
    }
  })
}

module.exports = {
  name: name,
  description: desc,
  category: categories.GAS,
  algorithm: algo.EXACT,
  Module: deleteDynamicArrays
}
