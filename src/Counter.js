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

  errorIfRunning() {
    return async function(now) {
      await timeout(1000);
      if (now().giveItASecond.isRunning) {
        return await Promise.reject('Give it a second!!!');
      }
    }
  }
}

let counter = create(CounterState, {});

function Counter({ store }) {
  if (!store.counter) return;
  return (
    <div>
      <h3>Counter</h3>
      <button onClick={() => store.counter.increment()}>++1</button>
      <button onClick={() => store.counter.decrement()}>--1</button>
      <button onClick={() => store.counter.giveItASecond()} disabled={store.counter.giveItASecond.isRunning}>Increment via space <span role="img" aria-label="rocket">🚀</span></button>
      <button onClick={() => store.counter.errorIfRunning()}>Will error if clicked while running</button>
      <ul>
        <li>Clicks: {store.state.counter.clicks}</li>
        <li>Count: {store.state.counter.count}</li>
        <li>{store.counter.giveItASecond.isRunning ? 'Loading...' : null}</li>
        <li>{store.counter.errorIfRunning.hasError ? `Error: ${store.counter.errorIfRunning.error}` : null}</li>
      </ul>
    </div>
  )
}

export default connect(store)(Counter, store => store.counter ? store : store.put('counter', counter));