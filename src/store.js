import Microstate, { from, reveal, create, types, Tree } from "microstates";
import { from as observableFrom, ReplaySubject } from "rxjs";
import { multicast } from "rxjs/operators";
import view from "ramda/src/view";
import compose from "ramda/src/compose";
import lensPath from "ramda/src/lensPath";
import { append, map } from "funcadelic";

let monadSymbol = Object.getOwnPropertySymbols(Tree.prototype)
    .find(symbol => symbol.toString() === 'Symbol(Monad)');
let { flatMap } = Tree.prototype[monadSymbol];

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
        map((transitionState, transitionName) => {
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

function serialize(tree) {
  if (tree.hasChildren) {
    return {
      Type: tree.meta.InitialType.name,
      children: map(serialize, tree.children)
    }
  } else {
    return {
      Type: tree.meta.InitialType.name,
      value: tree.value
    }
  }
}

const defaultResolve = Type => {
  throw new Error(`You must provide a resolve function to convert  type ${Type} string to constructor.`)
}

function deserialize(serializable, resolve = defaultResolve ) {
  function from(props) {
    let { value, Type, children } = props;
    let root = Type ? new Tree({ Type: resolve(Type), value }) : Tree.from(value);
    
    if (children) {
      return flatMap(tree => {
        if (tree.is(root)) {
          return tree.assign({
            meta: {
              children() {
                return map((child, key) => from(child).graft([key]), children);
              }
            },
            data: {
              value(instance) {
                return map(child => child.value, instance.children);
              }
            }
          });
        }
        return tree;
      }, root);
    }
    
    return root;
  }
  
  return from(serializable);
}

function connectReduxDevTools(remoteDev) {
  let connected;
  let initial;
  let last;
  let replacing = false;
 
  function handleMonitorActions(message) {
    switch (message.payload.type) {
      case "RESET": {
        let serialized = serialize(reveal(initial));
        replaceWith(serialized);
        return connected.init(serialized);
      }
      case "COMMIT": {
        let serialized = serialize(reveal(last));
        return connected.init(serialized);
      }
      case "ROLLBACK": {
        let serialized = remoteDev.extractState(message);
        return connected.init(serialized);
      }
      case "JUMP_TO_STATE":
      case "JUMP_TO_ACTION":
        replaceWith(remoteDev.extractState(message));
        return;
      // case "IMPORT_STATE":
      //   const nextLiftedState = message.payload.nextLiftedState
      //   const computedStates = nextLiftedState.computedStates
      //   replaceWith(computedStates[computedStates.length - 1].state);
      //   return connected.send(null, nextLiftedState)
      default:
    }
  }

  function replaceWith(incoming) {
    replacing = true;
    let { types } = reveal(last);
    let tree = deserialize(incoming, Type => types[Type]);
    last.set(tree.microstate);
    replacing = false;
  }

  return next => {
    
    return (microstate, transition, args) => {
      let { root, path } = reveal(microstate);

      if (!connected) {
        initial = root.microstate;

        connected = remoteDev.connectViaExtension({ name: root.meta.InitialType.constructor.name });

        connected.subscribe(message => {
          if (message.type === "DISPATCH") {
            handleMonitorActions(message)
          }
        });

        connected.init(serialize(root));
      }

      last = next(microstate, transition, args);

      let message = {
        type: [...path, transition.name].join('.'),
        args
      };

      if (!replacing) {
        connected.send(message, serialize(reveal(last)));
      }

      return last;
    }
  }
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

let middlewares = compose(connectReduxDevTools(require("remotedev")), logger, asyncMiddleware);

// 2. add the async & logger middleware 
let async = Microstate.map(tree => tree.use(middlewares), initial);

// 3. create an observable that allows multiple subscribers to receive state changes
export default createStore(async);
