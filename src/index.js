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

      try {
        dispose = run(main, drivers);
      } catch (e) {
        console.error('Error running inner app', main);
        console.error(e);
      }
    }
  });
}

const drivers = {
  DOM: makeDOMDriver('#app'),
  InnerApp: innerAppDriver
};

run(App, drivers);
