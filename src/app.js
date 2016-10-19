import {div, pre, svg, h} from '@cycle/dom';
import xs from 'xstream';

function App (sources) {
  const initialState = {};

  const state$ = xs.of(initialState);

  return {
    DOM: state$.map(view)
  };
}

function view () {
  return (
    div('.hello-world', [
      svg({
        attrs: {
          width: document.documentElement.clientWidth - 20,
          height: document.documentElement.clientHeight - 30
        }
      }, [
        renderCodeBlock(App.toString(), {x: 200, y: 200})
      ])
    ])
  )
}

function renderCodeBlock (code, {x, y}) {
  const lines = code.split('\n');
  const LINE_HEIGHT = 16;
  const CHARACTER_WIDTH = 8;
  const PADDING = 10;

  const longestLine = Math.max(...lines.map(line => line.length));

  return (
    h('g', [
      h('rect', {
        attrs: {
          x,
          y,
          height:  lines.length * LINE_HEIGHT + PADDING,
          width: longestLine * CHARACTER_WIDTH + PADDING,
          stroke: 'skyblue',
          fill: '#333533'
        }
      }),

      h('foreignObject', {attrs: {x: x + 10, y: y + 10}}, [
        div('.code-wrapper', [
          pre(code)
        ])
      ])
    ])
  );
}

export default App;
