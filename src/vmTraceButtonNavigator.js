var React = require('react');

module.exports = React.createClass({
    
    propTypes: {
    	stepIntoBack: React.PropTypes.func.isRequired,
        stepIntoForward: React.PropTypes.func.isRequired,
        stepOverBack: React.PropTypes.func.isRequired,
        stepOverForward: React.PropTypes.func.isRequired,
		jumpToNextCall: React.PropTypes.func.isRequired
  	},
    
    render: function() {		
		return (
			<div>
				<button onClick={this.props.stepIntoBack} disabled={this.buttonDisabled(-1)} >Step Into Back</button>
				<button onClick={this.props.stepOverBack} disabled={this.buttonDisabled(-1)} >Step Over Back</button>
				<button onClick={this.props.stepOverForward} disabled={this.buttonDisabled(1)} >Step Over Forward</button>
				<button onClick={this.props.stepIntoForward} disabled={this.buttonDisabled(1)} >Step Into Forward</button>
				<button onClick={this.props.jumpToNextCall} >Jump to Next Call</button>
			</div>
			);
	},
	
	buttonDisabled: function(incr)
	{
        if (incr === -1)
			return this.props.step === 0 ? "disabled" : ""
		else if (incr === 1)
			return this.props.step >= this.props.vmTraceLength - 1 ? "disabled" : "" 
	},
})