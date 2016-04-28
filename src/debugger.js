var React = require('react');
var TxBrowser = require('./txBrowser');
var VmTraceManager = require('./vmTraceManager');
var style = require('./basicStyles')
var AssemblyItemsBrowser = require('./assemblyItemsBrowser');

module.exports = React.createClass({
	
	getInitialState: function() {
		return {transaction: null, vmTrace: null, state: "", currentStep: -1}
	},

	render: function() {
		return (
			<div style={style.wrapper} >
				<h1 style={style.container} >Eth Debugger</h1>
				<TxBrowser onNewTxRequested={this.retrieveVmTrace} />
				<div style={style.container} >{this.state.state}</div>
				<AssemblyItemsBrowser vmTrace={this.state.vmTrace} transaction={this.state.transaction}/> 
			</div>
			);
	},

	retrieveVmTrace: function(blockNumber, txNumber, tx)
	{
		this.setState({state: "loading..."})
		var deb = this
		VmTraceManager.retrieveVmTrace(blockNumber, txNumber, function(error, result)
		{
			deb.setState({vmTrace: result, state: "", transaction: tx});
		})
	}
});
