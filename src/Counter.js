import React from 'react';
import { create } from 'microstates';
import connect from './connect';
import store from './store';

class CounterState {
  clicks = Number;
  count = Number;

  increment() {
    return this.clicks.increment().count.increment();
  }

  decrement() {
    return this.clicks.increment().count.decrement();
  }
}

function Counter({ store }) {
  return (
    <div>
      <h3>Counter</h3>
      <button onClick={() => store.counter.increment()}>++1</button>
      <button onClick={() => store.counter.decrement()}>--1</button>
      <ul>
        <li>Clicks: {store.state.counter.clicks}</li>
        <li>Count: {store.state.counter.count}</li>
      </ul>
    </div>
  )
}

export default connect(store)(Counter, store => store.put('counter', create(CounterState, {})));