import {div, pre, svg, h, button} from '@cycle/dom';
import xs from 'xstream';

function mousePositionFromEvent (event) {
  return {
    x: event.clientX,
    y: event.clientY
  }
}

function App (sources) {
  const {DOM} = sources;

  const initialState = {
    zoom: 1
  };

  const mouseWheel$ = DOM
    .select('document')
    .events('mousewheel');


  const zoomOut$ = mouseWheel$
    .filter(ev => ev.wheelDelta < 0)
    .map(ev => (state) => ({
      ...state,
      zoom: state.zoom + 0.03
    }));

  const zoomIn$ = mouseWheel$
    .filter(ev => ev.wheelDelta > 0)
    .map(ev => (state) => ({
      ...state,
      zoom: state.zoom - 0.03
    }));

  const mousePosition$ = DOM
    .select('document')
    .events('mousemove')
    .map(mousePositionFromEvent)
    .startWith({});

  const reducer$ = xs.merge(
    zoomOut$,
    zoomIn$
  );

  const state$ = reducer$.fold((state, reducer) => reducer(state), initialState);

  return {
    DOM: state$.map(view)
  };
}

function translateZoom (zoom, width, height) {
  return {
    x: -(zoom - 1) * width / 2,
    y: -(zoom - 1) * height / 2,
    width: width * zoom,
    height: height * zoom
  }
}

function view (state) {
  const width = document.documentElement.clientWidth - 20;
  const height = document.documentElement.clientHeight - 30;
  const zoomedDimensions = translateZoom(state.zoom, width, height);
  return (
    div('.hello-world', [
      svg({
        attrs: {
          width,
          height,
          viewBox: `${zoomedDimensions.x} ${zoomedDimensions.y} ${zoomedDimensions.width} ${zoomedDimensions.height}`
        }
      }, [
        h('rect', {attrs: {x: 20, y: 20, width: width - 40, height: height - 40, stroke: 'skyblue', fill: '#222322'}}),
        h('text', {attrs: {x: 40, y: 55, 'font-family': 'monospace', 'font-size': 30, stroke: '#DDD', fill: '#DDD'}}, 'main'),
        h('line', {attrs: {x1: width / 2 - 70, y1: 40, x2: 400, y2: height - 50, stroke: 'lightgreen', strokeWidth: 2}}),
        renderCodeBlock('DOM', {x: width / 2 - 70, y: 50}),
        renderCodeBlock(JSON.stringify(state, null, 2), {x: 150, y: 200}),
        renderCodeBlock('xs.of(div("hello world"))', {x: 400, y: 400}),
        renderCodeBlock('DOM', {x: width / 2 - 70, y: height - 60})
      ])
    ])
  )
}

function renderCodeBlock (code, {x, y}) {
  const lines = code.split('\n');
  const LINE_HEIGHT = 23;
  const CHARACTER_WIDTH = 11.6;
  const PADDING = 10;

  const longestLine = Math.max(...lines.map(line => line.length));

  const height = lines.length * LINE_HEIGHT + PADDING;
  const width = longestLine * CHARACTER_WIDTH + PADDING;

  x -= width / 2;
  y -= height / 2;

  return (
    h('g', [
      h('rect', {
        attrs: {
          x,
          y,
          height,
          width,
          stroke: 'skyblue',
          fill: '#333533'
        }
      }),

      h('foreignObject', {attrs: {x: x + 5, y: y + 6}}, [
        div('.code-wrapper', [
          pre(code)
        ])
      ])
    ])
  );
}

export default App;
