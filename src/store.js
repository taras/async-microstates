import { from, map, reveal } from 'microstates';
import { from as observableFrom } from 'rxjs';
import view from 'ramda/src/view';
import set from 'ramda/src/set';
import lensPath from 'ramda/src/lensPath';

function createStore(initial) {
  let last;

  last = map(tree => tree.use(next => {
    return (microstate, transition, args) => {  

      function wrapped(...args) {
        let tree = reveal(microstate);
        let result = transition.apply(this, args);

        if (typeof result === 'function') {
          function constructor() {
            return view(tree.lens, reveal(last)).microstate;
          }

          let thunk = result(constructor)
            .then(next => view(lensPath(tree.path), last).set(next))
            .catch(next => view(lensPath(tree.path), last).set(next))

          // this should return some indicator that the task is running
          return tree.prune().microstate;
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