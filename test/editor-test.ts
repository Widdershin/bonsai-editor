import {mockTimeSource} from '@cycle/time';
import {mockDOMSource} from '@cycle/dom';
import * as simulant from 'simulant';
import xs from 'xstream';

const initialState = {
  cursor: 0,

  nodes: {
    0: {
      type: 'input',
      text: 'DOM'
    }
  },

  edges: {
  }
}

const stateWithNewNode = {
  ...initialState,

  cursor: 1,

  nodes: {
    0: {
      type: 'input',
      text: 'DOM'
    },

    1: {
      type: 'code',
      text: ''
    }
  },

  edges: {
    0: {
      from: 0,
      to: 1
    }
  }
}

function findEdgeId (edges) {
  const currentIds = Object.keys(edges);

  if (currentIds.length === 0) {
    return 0;
  }

  return Math.max(...currentIds.map(i => parseInt(i, 10))) + 1;
}

function addNode (state) {
  const newNodeId = Math.max(...Object.keys(state.nodes).map(i => parseInt(i, 10))) + 1;
  const newEdgeId = findEdgeId(state.edges);

  return {
    ...state,

    cursor: newNodeId,

    nodes: {
      ...state.nodes,

      [newNodeId]: {
        type: 'code',
        text: ''
      }
    },

    edges: {
      ...state.edges,

      [newEdgeId]: {
        from: state.cursor,
        to: newNodeId
      }
    }
  }
}

function handleInput (state, action) {
  return {
    ...state,

    nodes: {
      ...state.nodes,

      [state.cursor]: {
        ...state.nodes[state.cursor],

        text: action.payload
      }
    }
  }
}

function updateState (state, action) {
  if (action.type === "ENTER") {
    return addNode(state);
  } else if (action.type === "INPUT") {
    return handleInput(state, action);
  } else {
    throw new Error(`what to do with with ${action.type}`);
  }
}

function Editor (sources) {
  const keydown$ = sources
    .DOM
    .select('document')
    .events('keydown')
    .filter(ev => ev.key === 'Enter')
    .map(ev => ({type: 'ENTER'}));

  const input$ = sources
    .DOM
    .select('.cursor-code input')
    .events('input')
    .map(ev => ({type: 'INPUT', payload: ev.target.value}));

  const action$ = xs.merge(
    keydown$,
    input$
  );

  const state$ = action$
    .fold(updateState, sources.initialState || initialState);

  return {
    state$
  }
}

describe.only('bonsai editor', () => {
  it('creates a new node when you press enter', (done) => {
    const Time = mockTimeSource();

    const enterPress = {key: 'Enter'};

    const enter$    = Time.diagram('---x---', {x: enterPress});
    const expected$ = Time.diagram('a--b---', {a: initialState, b: stateWithNewNode});

    const DOM = mockDOMSource({
      'document': {
        'keydown': enter$
      }
    });

    const editor = Editor({DOM, Time});

    Time.assertEqual(editor.state$, expected$);

    Time.run(done);
  });

  const stateWithInput = {
    ...stateWithNewNode,

    nodes: {
      ...stateWithNewNode.nodes,

      1: {
        ...stateWithNewNode.nodes[1],

        text: '.select(".add")'
      }
    }
  }

  it('updates the node text on input', (done) => {
    const Time = mockTimeSource();

    const inputEvent = {target: {value: '.select(".add")'}};

    const input$    = Time.diagram('---x---', {x: inputEvent});
    const expected$ = Time.diagram('a--b---', {a: stateWithNewNode, b: stateWithInput});

    const DOM = mockDOMSource({
      '.cursor-code input': {
        'input': input$
      }
    });

    const editor = Editor({DOM, Time, initialState: stateWithNewNode});

    const actual$ = editor.state$;

    Time.assertEqual(actual$, expected$);

    Time.run(done);
  });

  const stateWithNewNodeAndInput = addNode(stateWithInput);
  const stateWithAllTheThings = handleInput(stateWithNewNodeAndInput, {payload: '.events("click")'});
  const stateWithAllTheThingsAndNewNode = addNode(stateWithAllTheThings);
  const stateWithMapTo = handleInput(stateWithAllTheThingsAndNewNode, {payload: '.mapTo(+1)'})

  it('finishes editing and makes a new node when you press enter', (done) => {
    const Time = mockTimeSource();

    const enterPress = {key: 'Enter'};
    const inputEvent = {target: {value: '.events("click")'}};
    const inputMapTo = {target: {value: '.mapTo(+1)'}};

    const enter$    = Time.diagram('---x-----x', {x: enterPress});
    const input$    = Time.diagram('------x-----y', {x: inputEvent, y: inputMapTo});
    const expected$ = Time.diagram('a--b--c--d--e', {
      a: stateWithInput,
      b: stateWithNewNodeAndInput,
      c: stateWithAllTheThings,
      d: stateWithAllTheThingsAndNewNode,
      e: stateWithMapTo
    });

    const DOM = mockDOMSource({
      'document': {
        'keydown': enter$
      },

      '.cursor-code input': {
        'input': input$
      }
    });

    const editor = Editor({DOM, Time, initialState: stateWithInput});

    Time.assertEqual(editor.state$, expected$);

    Time.run(done);
  });

  const stateWithEmptyFold = addNode(stateWithMapTo);
  const stateWithFold = handleInput(stateWithEmptyFold, {payload: '.fold((acc, val) => acc + val, 0)'});
  const stateWithEmptyRenderView = addNode(stateWithFold);
  const stateWithRenderView = handleInput(stateWithEmptyRenderView, {payload: ".map(renderView)"});

  it('allows you to finish a branch', (done) => {
    const Time = mockTimeSource();

    const enterPress = {key: 'Enter'};
    const inputEvent = {target: {value: '.fold((acc, val) => acc + val, 0)'}};
    const foldEvent = {target: {value: '.map(renderView)'}};

    const enter$    = Time.diagram('---x-----x----', {x: enterPress});
    const input$    = Time.diagram('------x-----y-', {x: inputEvent, y: foldEvent});
    const expected$ = Time.diagram('a--b--c--d--e-', {
      a: stateWithMapTo,
      b: stateWithEmptyFold,
      c: stateWithFold,
      d: stateWithEmptyRenderView,
      e: stateWithRenderView
    });

    const DOM = mockDOMSource({
      'document': {
        'keydown': enter$
      },

      '.cursor-code input': {
        'input': input$
      }
    });

    const editor = Editor({DOM, Time, initialState: stateWithMapTo});

    Time.assertEqual(editor.state$, expected$);

    Time.run(done);
  });
});

