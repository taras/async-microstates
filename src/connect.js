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
          if (this._isSetup) {
            this.setState({ store });
          } else {
            this._isSetup = true;
            setup(store);
          }
        });
      }
    
      componentWillUnmount() {
        this.subscription.unsubscribe();
      }
    
      render() {
        if (this._isSetup) {
          return <OriginalComponent {...this.props} store={this.state.store}/>;
        } else {
          return null;
        }
      }
    }
  
    return Connected;
  }
}