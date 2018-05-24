import Microstate, { from, map, reveal, create, types } from "microstates";
import { from as observableFrom, ReplaySubject } from "rxjs";
import { multicast } from "rxjs/operators";
import view from "ramda/src/view";
import compose from "ramda/src/compose";
import lensPath from "ramda/src/lensPath";
import { append, map as fMap } from "funcadelic";

class Async {
  status = types.Any;
  error = types.Any;

  get isRunning() {
    return this.status === "running";
  }

  get isFinished() {
    return this.status === "finished";
  }

  get hasError() {
    return !!this.error;
  }

  start() {
    return this.status.set("running");
  }

  finish(error) {
    return this.error.set(error).status.set("finished");
  }
}

function makeAsyncClass(TransitionsClass) {
  return class AsyncTransitions extends TransitionsClass {
    constructor(tree) {
      super(tree);

      let wrapped = append(
        this,
        fMap((transitionState, transitionName) => {
          return Object.defineProperties(this[transitionName].bind(wrapped), {
            isRunning: {
              configurable: true,
              enumerable: true,
              get() {
                return transitionState.isRunning;
              }
            },
            isFinished: {
              configurable: true,
              enumerable: true,
              get() {
                return transitionState.isFinished;
              }
            },
            hasError: {
              configurable: true,
              enumerable: true,
              get() {
                return transitionState.hasError;
              }
            },
            error: {
              configurable: true,
              enumerable: true,
              get() {
                return transitionState.error;
              }
            }
          });
        }, tree.data.async.state)
      );

      return wrapped;
    }
  }
}

function ensureAsync(tree) {
  if (tree.data.async) {
    return tree;
  } else {
    return tree.assign({
      data: {
        async: create({ Async }, {})
      },
      meta: {
        TransitionsClass: makeAsyncClass(tree.meta.TransitionsClass)
      }
    });
  }
}

function start(tree, transition) {
  let withAsync = ensureAsync(tree);

  let { async } = withAsync.data;

  if (async[transition.name]) {
    async = async[transition.name].start();
  } else {
    async = async.put(transition.name, { status: "running" });
  }

  return withAsync.assign({ data: { async } }).prune();
}

function asyncMiddleware(next) {
  let last;

  return (microstate, transition, args) => {
  
    function wrapped(...args) {
      let result = transition.apply(this, args);
      
      if (typeof result === "function") {
        let tree = reveal(microstate);
  
        let local = () => view(tree.lens, reveal(last)).microstate;
  
        let finish = (microstate, error) => {
          let nextTree = reveal(microstate);
          let updated = nextTree.assign({
            data: {
              async: nextTree.data.async[transition.name].finish(error)
            }
          });
          view(lensPath(tree.path), last).set(updated.microstate)
        }
  
        result(local)
          .then(result => finish(result instanceof Microstate ? result : local()))
          .catch(error => finish(local(), error));
  
        return start(tree, transition).microstate;
      }
  
      return result;      
    }
  
    return last = next(microstate, wrapped, args);
  };
}

function logger(next) {
  return (microstate, transition, args) => {
    console.log(`${reveal(microstate).path.concat(transition.name).join('.')}(${args})`);
    return next(microstate, transition, args);
  };
}

function createStore(microstate) {

  let multicasting = observableFrom(microstate)
    .pipe(
      multicast(() => new ReplaySubject(1))
    );

    multicasting.connect();

  return multicasting;
}

// 1. create an empty microstate
let initial = from({});

// 2. add the async & logger middleware 
let async = map(tree => tree.use(compose(logger, asyncMiddleware)), initial);

// 3. create an observable that allows multiple subscribers to receive state changes
export default createStore(async);
