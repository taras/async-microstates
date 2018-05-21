import Microstate from 'microstates';
import { map } from 'funcadelic';
import { from } from 'rxjs';
import { share } from 'rxjs/operators';

let initial = Microstate.from({});

let store = from(initial).pipe(share());

// let store = map(tree => tree.use(next => {
//   return (microstate, transition, args) => {

//     function wrapped(...args) {
//       console.log('wrapped', transition.name);
//       return transition.apply(this, args)
//     }

//     return next(microstate, wrapped, args);
//   }
// }), ms);

export default store;