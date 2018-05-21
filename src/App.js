import { create } from "microstates";
import React from "react";
import "./App.css";
import connect from "./connect";
import logo from "./logo.svg";
import store from "./store";

class AppState {
  name = String;
}

let app = create(AppState, { name: "Welcome to React" });

function App({ store }) {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="App-title">{store.app.name.state}</h1>
        <input
          type="text"
          value={store.app.state.name}
          onChange={e => store.app.name.set(e.target.value)}
        />
      </header>
      <p className="App-intro">
        To get started, edit <code>src/App.js</code> and save to reload.
      </p>
    </div>
  );
}

export default connect(store)(App, store => store.put("app", app));
