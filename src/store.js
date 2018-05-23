import { from, map, reveal, create, types } from 'microstates';
import { from as observableFrom } from 'rxjs';
import view from 'ramda/src/view';
import set from 'ramda/src/set';
import lensPath from 'ramda/src/lensPath';
import { append, map as fMap } from 'funcadelic';
class Async {
  status = types.Any;
  error = types.Any;

  get isRunning() {
    return this.status === 'running';
  }

  get isFinished() {
    return this.status === 'finished';
  }

  get hasError() {
    return !!this.error;
  }

  start() {
    return this.status.set('running');
  }

  finish(error) {
    return this.error.set(error).status.set('finished');
  }
}

function ensureAsync(tree) {
  if (tree.data.async) {
    return tree;
  } else {
    let { TransitionsClass } = tree.meta;
    class AsyncTransitions extends TransitionsClass {
      constructor(tree) {
        super(tree);

        let wrapped = append(this, fMap((transitionState, transitionName) => {
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
        }, tree.data.async.state));

        return wrapped;
      }
    }
    return tree.assign({
      data: { 
        async: create({ Async }, {})
      },
      meta: {
        TransitionsClass: AsyncTransitions 
      }
    });
  }
}

function createStore(initial) {
  let last = map(tree => tree.use(next => {
    return (microstate, transition, args) => {  

      function wrapped(...args) {
        let tree = reveal(microstate);
        let result = transition.apply(this, args);

        if (typeof result === 'function') {
          function constructor() {
            return view(tree.lens, reveal(last)).microstate;
          }

          let thunk = result(constructor)
            .then(next => {
              let nextTree = reveal(next);
              let updated = nextTree.assign({ 
                data: {
                  async: nextTree.data.async[transition.name].finish()
                }
              }).microstate;
              view(lensPath(tree.path), last).set(updated);
            })
            .catch(error => {
              let next = view(lensPath(tree.path), last);
              let nextTree = reveal(next);
              let updated = nextTree.assign({ 
                data: {
                  async: nextTree.data.async[transition.name].finish(error)
                }
              }).prune().microstate;
              view(lensPath(tree.path), last).set(updated);
            })

          let withAsync = ensureAsync(tree);

          let { async } = withAsync.data;

          if (async[transition.name]) {
            async = async[transition.name].start();
          } else {
            async = async.put(transition.name, { status: 'running' } );
          }

          return withAsync.assign({ data: { async } }).prune().microstate
        } else {
          return result;
        }
      }

      return last = next(microstate, wrapped, args);
    }
  }), initial);

  return last = observableFrom(last);
}

export default createStore(from({}));