import {div, pre, svg, h, button, body} from '@cycle/dom';
import xs from 'xstream';
import _ from 'lodash';
import Vector from './vector';

function mousePositionFromEvent (event) {
  return Vector({
    x: event.clientX,
    y: event.clientY
  });
}

function panReducer (pan) {
  return function _panReducer (state) {
    if (state.selectedCodeBlock) {
      return {
        ...state,

        codeBlockPosition: state.codeBlockPosition.add(pan)
      };
    }

    return {
      ...state,

      pan: state.pan.minus(pan.times(state.zoom))
    };
  };
}

function App (sources) {
  const {DOM} = sources;

  const initialState = {
    zoom: 1,

    pan: Vector.zero,
    codeBlockPosition: Vector.zero,

    nodes: {
      A: {type: 'input', name: 'DOM', position: Vector({x: 400, y: 50})},
      B: {type: 'code', text: 'xs.of("nello world")', position: Vector({x: 400, y: 400})},
      C: {type: 'output', name: 'DOM', position: Vector({x: 400, y: 900})}
    },

    edges: [
      {from: 'A', to: 'B'},
      {from: 'B', to: 'C'}
    ],

    selectedCodeBlock: false
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

  const codeBlockMousedown$ = DOM
    .select('.code-wrapper')
    .events('mousedown');

  const selectCodeBlock$ = codeBlockMousedown$
    .map(ev => (state) => ({...state, selectedCodeBlock: true}));

  const svgMousedown$ = DOM
    .select('svg')
    .events('mousedown');

  const svgMouseup$ = DOM
    .select('svg')
    .events('mouseup');

  const mouseup$ = DOM
    .select('document')
    .events('mouseup');

  const mousePosition$ = DOM
    .select('document')
    .events('mousemove')
    .map(mousePositionFromEvent)
    .startWith(Vector.zero);

  const mousePositionChange$ = mousePosition$
    .fold(({lastPosition}, position) => ({
      lastPosition: position,
      delta: position.minus(lastPosition)
    }), {lastPosition: Vector.zero})
    .drop(1)
    .map(({delta}) => delta);

  const panning$ = xs.merge(
    svgMousedown$.mapTo(true),
    svgMouseup$.mapTo(false)
  ).startWith(false);

  const pan$ = panning$
    .map(panning => mousePositionChange$.filter(() => panning))
    .flatten();

  const reducer$ = xs.merge(
    zoomOut$,
    zoomIn$,
    pan$.map(panReducer),

    selectCodeBlock$,
    mouseup$.mapTo(state => ({...state, selectedCodeBlock: false}))
  );

  const state$ = reducer$.fold((state, reducer) => reducer(state), initialState);

  return {
    DOM: state$.map(view)
  };
}

function translateZoom (zoom, pan, width, height) {
  return {
    x: -(zoom - 1) * width / 2 + pan.x,
    y: -(zoom - 1) * height / 2 + pan.y,
    width: width * zoom,
    height: height * zoom
  };
}

function view (state) {
  const width = document.documentElement.clientWidth - 20;
  const height = document.documentElement.clientHeight - 30;
  const zoomedDimensions = translateZoom(state.zoom, state.pan, width, height);
  const blockWidth = width / 2;

  return (
    div('.hello-world', [
      svg({
        attrs: {
          width,
          height,
          viewBox: `${zoomedDimensions.x} ${zoomedDimensions.y} ${zoomedDimensions.width} ${zoomedDimensions.height}`
        }
      }, [
        h('g', [
          h('foreignObject', {class: 'preview', attrs: {x: blockWidth + 30, y: 20, width: blockWidth, height: blockWidth - 50}}, [
            body('.preview', [
              div('hello world')
            ])
          ])
        ]),

        renderBlock(state, {x: 0, y: 0, width: blockWidth, height: blockWidth})
      ])
    ])
  );
}

function renderBlock (state, {x, y, width, height}) {
  return (
    h('g', {class: 'code-block'}, [
      h('rect', {attrs: {x: 20, y: 20, width: width - 40, height: height - 40, stroke: 'skyblue', fill: '#222322'}}),
      h('text', {attrs: {x: 40, y: 55, 'font-family': 'monospace', 'font-size': 30, stroke: '#DDD', fill: '#DDD'}}, 'main'),
      renderCodeBlock(JSON.stringify(state, null, 2), {x: -300, y: 500}),

      ...state.edges.map(edge => renderEdge(edge, state)),
      ..._.values(state.nodes).map(renderNode)
    ])
  );
}

function renderNode (node) {
  if (node.type === 'input') {
    return renderCodeBlock(node.name, node.position);
  }

  if (node.type === 'output') {
    return renderCodeBlock(node.name, node.position);
  }

  if (node.type === 'code') {
    return renderCodeBlock(node.text, node.position);
  }
}

function renderEdge (edge, state) {
  const from = state.nodes[edge.from].position;
  const to = state.nodes[edge.to].position;

  return (
    h(
      'line',
      {
        attrs: {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          stroke: 'lightgreen',
          strokeWidth: 2
        }
      }
    )
  );
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
