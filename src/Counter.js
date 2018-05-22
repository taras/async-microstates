import React from 'react';
import { create } from 'microstates';
import connect from './connect';
import store from './store';

function timeout(interval) {
  return new Promise(resolve => setTimeout(resolve, interval));
}

class CounterState {
  clicks = Number;
  count = Number;

  increment() {
    return this.clicks.increment().count.increment();
  }

  decrement() {
    return this.clicks.increment().count.decrement();
  }

  giveItASecond() {
    return async function(now) {
      await timeout(3000);
      return await now().increment();
    }
  }
}

function Counter({ store }) {
  return (
    <div>
      <h3>Counter</h3>
      <button onClick={() => store.counter.increment()}>++1</button>
      <button onClick={() => store.counter.decrement()}>--1</button>
      <button onClick={() => store.counter.giveItASecond()}>Increment via space 🚀</button>
      <ul>
        <li>Clicks: {store.state.counter.clicks}</li>
        <li>Count: {store.state.counter.count}</li>
      </ul>
    </div>
  )
}

export default connect(store)(Counter, store => store.put('counter', create(CounterState, {})));