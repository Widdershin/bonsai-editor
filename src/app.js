import {div, pre, svg, h, button, body, textarea} from '@cycle/dom';
import xs from 'xstream';
import _ from 'lodash';
import Vector from './vector';
import vm from 'vm';

function findInputNodes (state) {
  const nodes = Object.values(state.graph.nodes);

  return nodes.filter(node => node.type === 'input');
}

function findConnectedNodes (state, node) {
  const id = node.id;

  const edgesTo = state.graph.edges
    .filter(edge => edge.from === id)
    .map(edge => edge.to);

  return edgesTo.map(nodeId => state.graph.nodes[nodeId]);
}

function graphToInnerAppMain (state) {
  return function innerAppMain (sources) {
    const inputNodes = findInputNodes(state);
    let output = {};

    function doNodeThing (node, sourceValue) {
      if (node.type === 'output') {
        output[node.name] = sourceValue;

        return;
      }

      const connectedNodes = findConnectedNodes(state, node);
      let result;

      if (node.type === 'input') {
        result = sources[node.name];
      }

      if (node.type === 'code') {
        const context = {
          xs,
          div
        };

        result = vm.runInNewContext(node.text, context);
      }

      connectedNodes.forEach(connectedNode =>
        doNodeThing(connectedNode, result)
      );
    }

    inputNodes.forEach(doNodeThing);

    return output;
  }
}

function mousePositionFromEvent (event) {
  return Vector({
    x: event.clientX,
    y: event.clientY
  });
}

  const width = document.documentElement.clientWidth - 20;
  const height = document.documentElement.clientHeight - 30;

function panReducer (pan) {
  return function _panReducer (state) {
    const scaledPan = pan.times(state.zoom);

    if (state.selectedCodeBlock) {
      const selectedNode = state.graph.nodes[state.selectedCodeBlock];

      return {
        ...state,

        graph: {
          ...state.graph,

          nodes: {
            ...state.graph.nodes,

            [state.selectedCodeBlock]: {
              ...selectedNode,

              position: selectedNode.position.plus(scaledPan)
            }
          }
        }
      };
    }

    return {
      ...state,

      pan: state.pan.minus(scaledPan)
    };
  };
}

function App (sources) {
  const {DOM} = sources;

  const initialState = {
    zoom: 1,

    pan: Vector.zero,
    codeBlockPosition: Vector.zero,

    editing: null,

    graph: {
      nodes: {
        A: {
          id: 'A',
          type: 'input',
          name: 'DOM',
          position: Vector({x: 400, y: 50})
        },

        B: {
          id: 'B',
          type: 'code',
          text: 'xs.of("nello world")',
          position: Vector({x: 400, y: 200})
        },

        C: {
          id: 'C',
          type: 'output',
          name: 'DOM',
          position: Vector({x: 400, y: 500})
        }
      },

      edges: [
        {from: 'A', to: 'B'},
        {from: 'B', to: 'C'}
      ]
    },

    selectedCodeBlock: null,

    // TODO - driverize
    width: document.documentElement.clientWidth - 20,
    height: document.documentElement.clientHeight - 30
  };

  const mouseWheel$ = DOM
    .select('document')
    .events('mousewheel');

  const zoom$ = mouseWheel$.map(event => state => {
    const zoom = event.wheelDelta < 0 ? 0.05 : -0.05;

    const center = Vector({
      x: state.width / 2,
      y: state.height / 2
    });

    const mousePosition = Vector({
      x: event.clientX,
      y: event.clientY
    });

    const distance = mousePosition.minus(center);

    return {
      ...state,

      pan: state.pan.plus(distance.times(state.zoom).times(-zoom)),

      zoom: state.zoom * (1 + zoom)
    }
  });

  const codeBlockMousedown$ = DOM
    .select('.code-wrapper')
    .events('mousedown');

  const selectCodeBlock$ = codeBlockMousedown$
    .map(ev => (state) => ({...state, selectedCodeBlock: ev.ownerTarget.dataset.id}));

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

  const editing$ = DOM
    .select('.code-wrapper')
    .events('dblclick')
    .map(ev => (state) => {
      return {
        ...state,

        editing: ev.ownerTarget.dataset.id
      }
    });

  const finishEditing$ = DOM
    .select('.code-wrapper textarea')
    .events('change')
    .map(ev => (state) => {
      const editingNode = state.graph.nodes[state.editing];

      return {
        ...state,

        editing: null,

        graph: {
          ...state.graph,

          nodes: {
            ...state.graph.nodes,

            [editingNode.id]: {
              ...editingNode,

              text: ev.target.value
            }
          }
        }
      }
    });

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
    zoom$,
    pan$.map(panReducer),
    editing$,
    finishEditing$,

    selectCodeBlock$,
    mouseup$.mapTo(state => ({...state, selectedCodeBlock: null}))
  );

  const state$ = reducer$.fold((state, reducer) => reducer(state), initialState);

  const innerAppMain$ = state$.map(graphToInnerAppMain);

  return {
    DOM: state$.map(view),

    InnerApp: innerAppMain$
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
  const {width, height} = state;
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
            body('#inner-app.preview', [
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
      //renderCodeBlock(JSON.stringify(state, null, 2), {x: -300, y: 500}),

      ...state.graph.edges.map(edge => renderEdge(edge, state)),
      ..._.values(state.graph.nodes).map(node => renderNode(node, state))
    ])
  );
}

function renderNode (node, state) {
  if (node.type === 'input') {
    return renderCodeBlock(node.name, node.position);
  }

  if (node.type === 'output') {
    return renderCodeBlock(node.name, node.position);
  }

  if (node.type === 'code') {
    return renderCodeBlock(node.text, node.position, node.id, state.editing === node.id);
  }
}

function renderEdge (edge, state) {
  const from = state.graph.nodes[edge.from].position;
  const to = state.graph.nodes[edge.to].position;

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

function renderCodeBlock (code, {x, y}, id, editing) {
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
        div('.code-wrapper', {attrs: {'data-id': id}}, [
          editing ? textarea(code) : pre(code)
        ])
      ])
    ])
  );
}

export default App;
