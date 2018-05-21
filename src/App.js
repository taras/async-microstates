import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import store from './store';
import { create } from 'microstates';

class AppState {
  name = String;
}

class App extends Component {

  state = {
    store: undefined
  }

  componentWillMount() {
    this.subscription = store.subscribe(store => {
      if (!store.state.app) {
        return store.put('app', create(AppState, { name: 'Welcome to React' }));
      }
      this.setState({ store });
    });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  render() {
    let { store } = this.state;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">{store.app && store.app.state.name}</h1>
          <input type="text" value={store.app && store.app.state.name} onChange={e => store.app.name.set(e.target.value)}/>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
