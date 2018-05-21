import { from, map } from 'microstates';
import { from as observableFrom } from 'rxjs';
import { share } from 'rxjs/operators';

function createStore(initial) {
  let last;

  last = map(tree => tree.use(next => {
    return (microstate, transition, args) => {
  
      function wrapped(...args) {
        // transition context is a microstate, 
        // it contains the path where the transition was invoked
        // when handling async operation, we want the result to 
        // be set into that path 
        let context = this;
        let result = transition.apply(context, args);
        console.log('wrapped', transition.name);
        console.log('result=', result);
        return result;
      }

      return last = next(microstate, wrapped, args);
    }
  }), initial);

  return last = observableFrom(last).pipe(share());
}

export default createStore(from({}));