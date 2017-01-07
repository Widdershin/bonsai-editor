import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import App from './app';

function innerAppDriver (sink$) {
  let dispose = () => {};

  sink$.addListener({
    next (main) {
      dispose();

      const drivers = {
        DOM: makeDOMDriver('#inner-app')
      }

      dispose = run(main, drivers);
    }
  });
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  InnerApp: innerAppDriver
};

run(App, drivers);
