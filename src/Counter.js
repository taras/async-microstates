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

  willReject() {
    return async function() {
      await timeout(1000);
      return await Promise.reject('Something terrible happened');
    }
  }
}

function Counter({ store }) {
  return (
    <div>
      <h3>Counter</h3>
      <button onClick={() => store.counter.increment()}>++1</button>
      <button onClick={() => store.counter.decrement()}>--1</button>
      <button onClick={() => store.counter.giveItASecond()} disabled={store.counter.giveItASecond.isRunning}>Increment via space 🚀</button>
      <button onClick={() => store.counter.willReject()}>Cause an error</button>
      <ul>
        <li>Clicks: {store.state.counter.clicks}</li>
        <li>Count: {store.state.counter.count}</li>
        <li>{store.counter.giveItASecond.isRunning ? 'Loading...' : null}</li>
        <li>{store.counter.willReject.hasError ? `Error: ${store.counter.willReject.error}` : null}</li>
      </ul>
    </div>
  )
}

export default connect(store)(Counter, store => store.put('counter', create(CounterState, {})));