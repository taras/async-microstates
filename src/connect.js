import React, { Component } from 'react';

export default function connect(store) {
  return function WrappedComponent(OriginalComponent, setup = store => store) {
    class Connected extends Component {

      static displayName = OriginalComponent.name

      state = {
        store: undefined
      }
    
      _isSetup = false;
  
      componentWillMount() {
        this.subscription = store.subscribe(store => {
          this.setState({ store: setup(store) });
        });
      }
    
      componentWillUnmount() {
        this.subscription.unsubscribe();
      }
    
      render() {
        return <OriginalComponent {...this.props} store={this.state.store}/>;
      }
    }
  
    return Connected;
  }
}