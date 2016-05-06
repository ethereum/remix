var React = require('react');
var style = require('./basicStyles')

module.exports = React.createClass({
	propTypes: {
		onNewTxRequested: React.PropTypes.func.isRequired,
	},

	getInitialState: function() {
		return {blockNumber: "1382256", txNumber: "1", from: "", to: "", hash: ""}
	},
	// contract invokation: 1382256 1
    /*
    {"blockHash":"0xe3b0c99e08379bf1f0e05b09bf5902cb8a2108cad5b3a814d15b19ef84a33882","blockNumber":1382256,"from":"0x61727f495f6bcaa392abbfde17cc7fb88ee45934","gas":2100000,"gasPrice":"20000000000","hash":"0x7d1a57565a8ed90e4979281e4a9677164fa0c0db7985f6bc25c160d4b4d0c7e5","input":"0x61461954","nonce":1101,"to":"0x9df97c7fa86aad302303251977f1fb0b9ea8f9e0","transactionIndex":1,"value":"0"}
    */
	
    // contract creation: 1419597 1
	submit: function()
	{
        var self = this
		var tx = web3.eth.getTransactionFromBlock(this.state.blockNumber, this.state.txNumber, function(error, tx)
        {
            if (tx)
            {
                self.setState({from: tx.from, to: tx.to ? tx.to : "(Contract Creation)", hash: tx.hash})
		        self.props.onNewTxRequested(self.state.blockNumber, parseInt(self.state.txNumber), tx)
            }
            else
                console.log("unable to get tx: " + self.state.blockNumber +  " " + self.state.txNumber)
        })
	},
	
	updateBlockN: function(ev) {
		this.state.blockNumber = ev.target.value;
	},
	
	updateTxN: function(ev) {
		this.state.txNumber = ev.target.value;
	},

	render: function() {		
		return (
			<div style={style.container} >
			<input onChange={this.updateBlockN} type="text" placeholder= {"Block number or hash (default 1382256)" + this.state.blockNumber}></input>
			<input onChange={this.updateTxN} type="text" placeholder={"Transaction Number (default 1) " + this.state.txNumber}></input>
			<button onClick={this.submit}>Get</button>
			<div style={style.transactionInfo}>
			<div>Hash: {this.state.hash}</div>
			<div>From: {this.state.from}</div>
			<div>To: {this.state.to}</div>
			</div>
			</div>
			);
	}
})
