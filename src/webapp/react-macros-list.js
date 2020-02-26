import React from 'react'; //eslint-disable-line no-unused-vars
import PropTypes from 'prop-types'; //eslint-disable-line no-unused-vars
import deepEqual from 'deep-eql';
import autobind from 'autobind-decorator';
import ShortcutsList from './react-shortcuts-list';

import { ListGroup, ListGroupItem } from 'reactstrap';

class MacrosListItem extends React.Component {
	static propTypes = {
		macro: PropTypes.object.isRequired,
		metadata: PropTypes.object.isRequired,
		onRemoveMacro: PropTypes.func.isRequired,
		onMacroConfig: PropTypes.func.isRequired,
	};
	
	constructor(props) {
		super(props);
		this.state = {
			detailsVisible: true,
		};
	}
	
	render() {
		let macro = this.props.macro;
		let metadata = this.props.metadata;
		
		//console.log(macro, metadata);
		
		let me = this;
		
		const ConfigScreen = global.hyperkeys_modules[metadata.name];
		
		return (
			<ListGroupItem>
				<div onClick={this.handleToggleDetails} style={{cursor:"pointer"}}>
					<span style={{lineHeight:"45px"}}>{this.state.detailsVisible ? "−":"+"} {macro.title}</span>
					<span className="pull-right">
						<span className="btn btn-danger" onClick={(e) => { e.stopPropagation(); if (confirm('Remove macro ?')) me.props.onRemoveMacro(macro.id); }}>&times;</span>
					</span>
				</div>
				{this.state.detailsVisible && (
					<div style={{marginTop: "10px"}}>
						{(metadata.configScreen && metadata.configScreen.enabled) && (
							<ListGroupItem>
								{ConfigScreen && <ConfigScreen config={macro.config} onSubmit={this.handleConfigChange}/>}
							</ListGroupItem>
						)}
						<ShortcutsList id_macro={macro.id} shortcuts={macro.shortcuts} metadatas={metadata.actions}/>
					</div>
				)}
			</ListGroupItem>
		);
	}
	
	@autobind
	handleConfigChange(config) {
		let macro = this.props.macro;
		window.ipc.send('set_config', { id: macro.id, config: config });
	}
	
	@autobind
	handleToggleDetails(e) {
		this.setState({detailsVisible: !this.state.detailsVisible});
	}
	
	@autobind
	handleToggleConfig(e) {
		this.setState({detailsVisible: !this.state.detailsVisible});
	}
	
	shouldComponentUpdate(nextProps, nextState) {
	    return !deepEqual(this.props, nextProps) || !deepEqual(this.state, nextState);
	}
}

export { MacrosListItem };

class MacrosList extends React.Component {
	static propTypes = {
		macros: PropTypes.array.isRequired,
		metadatas: PropTypes.object.isRequired,
		onRemoveMacro: PropTypes.func.isRequired,
		onMacroConfig: PropTypes.func.isRequired,
	};
	
	render() {
		let macros = this.props.macros;
		
		let shortcuts = macros.map((macro) => {
			return (
				<MacrosListItem key={"macro_"+macro.id} macro={macro} metadata={this.props.metadatas[macro.name]}
				                onRemoveMacro={this.props.onRemoveMacro} onMacroConfig={this.props.onMacroConfig}/>
			);
		});
		
		return (
			<ListGroup>
				{shortcuts}
			</ListGroup>
		);
	}
	
	shouldComponentUpdate(nextProps) {
		return !deepEqual(this.props, nextProps);
	}
}

export default MacrosList;
