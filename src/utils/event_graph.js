/**
 * Copyright 2018 Aarhus University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Internal
var { areActionsConflicting, ForkKind, JoinKind, Operation } = require('../common/trace.js');
var debugging = require('../common/debugging.js');
var Point = require('./point.js');
var SmartSet = require('../stdlib/smart-set.js');

// External
var colors = require('colors');
var util = require('util');

function eventIdOfOperation(op) {
  if (op.operation === Operation.JOIN) {
    return op.v;
  }
  return op.u;
}

function GraphNode(eventId) {
  this.eventId = eventId;
  this.labels = new Map(); // set of labels for every successor
  this.operations = [];
  this.predecessors = new SmartSet();
  this.successors = new SmartSet();
  this.cancelledBy = null;
  this.isAjaxResponse = false;
  this.isScriptExecution = false;
  this.isDerivedFromAjax = false;
  this.isDerivedFromDynamicallyLoadedScript = false;
}

GraphNode.prototype.addSuccessor = function (node, label) {
  var labelSet;
  if (this.labels.has(node)) {
    labelSet = this.labels.get(node);
  } else {
    labelSet = new Set();
    this.labels.set(node, labelSet);
  }
  labelSet.add(label);
  this.successors.add(node);
  node.predecessors.add(this);

  if (this.isDerivedFromAjax) {
    node.isDerivedFromAjax = true;
  }

  if (this.isDerivedFromDynamicallyLoadedScript) {
    this.isDerivedFromDynamicallyLoadedScript = true;
  }
};

GraphNode.prototype.removeSuccessor = function (node) {
  this.labels.delete(node);
  this.successors.delete(node);
  node.predecessors.delete(this);
};

GraphNode.prototype.getLabels = function (successor) {
  debugging.assert(successor instanceof GraphNode);
  debugging.assert(this.labels.has(successor));
  var labelList = Array.from(this.labels.get(successor));
  labelList.sort();
  return labelList.join(', ');
};

/**
 * Builds the happens-before relation using the algorithm from EventRacer:
 * https://github.com/eth-srl/EventRacer/blob/master/src/eventracer/races/
 * ThreadMapping.cpp.
 */
function EventGraph(trace) {
  var { eventIdToNode, nodes } = build(trace);
  this.eventIdToNode = eventIdToNode;
  this.nodes = nodes;

  if (trace.length > 0 && trace[0].operation === Operation.ROOT) {
    var rootEventId = trace[0].u;
    this.root = this.getNodeFromEventId(rootEventId);
  } else {
    this.root = null;
  }
}

EventGraph.prototype.deleteDisconnectedNodes = function () {
  if (this.root !== null) {
    var roots = this.findRoots();
    while (roots.length !== 1) {
      roots.forEach(function (root) {
        if (root !== this.root) {
          this.deleteNode(root);
        }
      }.bind(this));
      roots = this.findRoots();
    }
  }
  return this;
};

EventGraph.prototype.equals = function (graph) {
  debugging.assert(graph instanceof EventGraph);

  function visit(node1, node2) {
    if (node1.operations.length !== node2.operations.length ||
        node1.predecessors.length !== node2.predecessors.length ||
        node1.successors.length !== node2.successors.length) {
      return false;
    }

    // Check that `node1` and `node2` have the same operations.
    if (!node1.operations.every((op, i) => {
      var other = node2.operations[i];
      return op.operation === other.operation && op.kind === other.kind;
    })) {
      return false;
    }

    var remaining = node2.successors.toArray();
    return node1.successors.every((succ1) => {
      var i = remaining.findIndex((succ2) =>
        node1.getLabels(succ1) === node2.getLabels(succ2) &&
        visit(succ1, succ2));
      if (i >= 0) {
        // Delete the element that was similar to `successor` from `remaining`.
        remaining.splice(i, 1);
        return true;
      }
      return false;
    });
  }

  return visit(this.findUniqueRoot(/*fail=*/true),
               graph.findUniqueRoot(/*fail=*/true));
};

/**
 * Returns a list of all the cancelled nodes in this graph.
 */
EventGraph.prototype.findCancelled = function () {
  return this.nodes.filter((node) => !!node.cancelledBy);
};

/**
 * Returns a list of all the roots in this graph.
 */
EventGraph.prototype.findRoots = function () {
  return this.nodes.filter(this.isRoot);
};

/**
 * Returns a list of all the roots in this graph.
 */
EventGraph.prototype.isRoot = function (node) {
  return node.predecessors.size === 0 && node.cancelledBy === null;
};

/**
 * Returns the unique root of this graph. If there is not a unique root,
 * then this method returns null if `fail` is false, and throws if `fail` is
 * true.
 */
EventGraph.prototype.findUniqueRoot = function (fail) {
  var roots = this.findRoots();

  // Must have a unique root.
  if (roots.length !== 1) {
    console.warn('Event graph without a unique root'.red);
    debugging.assertFalse(fail);
    return null;
  }

  return roots[0];
};

/**
 * Returns the node that corresponds to a given event ID.
 */
EventGraph.prototype.getNodeFromEventId = function (eventId) {
  debugging.assertEq(typeof eventId, 'number');
  debugging.assert(this.eventIdToNode.has(eventId));
  return this.eventIdToNode.get(eventId);
};

/**
 * Returns true if this event graph and `eventGraph` is likely to have an AJAX
 * conflict.
 *
 * This is determined by checking if this event graph asynchronously updates
 * the UI, and `eventGraph` either synchronously other asynchronously updates
 * the *same part of the UI*.
 */
EventGraph.prototype.hasLikelyAJAXConflictWith = function (otherEventGraph) {
  debugging.assert(otherEventGraph instanceof EventGraph);

  function getActions(
      eventGraph, asynchronousActionsOnly, derivedFromAjaxOrScriptLoadingOnly) {
    var nodes = eventGraph.nodes;
    if (asynchronousActionsOnly) {
      var root = eventGraph.findUniqueRoot();
      if (root === null) {
        return [];
      } else {
        nodes = nodes.filter((node) => node !== root);
      }
    }

    if (derivedFromAjaxOrScriptLoadingOnly) {
      nodes = nodes.filter((node) =>
        node.isDerivedFromAjax || node.isDerivedFromDynamicallyLoadedScript);
    }

    return nodes.map((node) => node.operations)
                .reduce((acc, operations) =>
                          (Array.prototype.push.apply(acc, operations), acc),
                        /*initialValue=*/[]);
  }

  var asynchronousActions =
    getActions(this, /*asynchronousActionsOnly=*/true,
                     /*derivedFromAjaxOrScriptLoadingOnly=*/true);

  var otherActions =
    getActions(otherEventGraph, /*asynchronousActionsOnly=*/false,
                                /*derivedFromAjaxOrScriptLoadingOnly=*/false);

  // Search for an operation in `asynchronousActions` that is conflicting with
  // an operation in `otherActions`.
  return asynchronousActions.some((action) =>
           otherActions.some((otherAction) =>
             areActionsConflicting(action, otherAction)));
};

EventGraph.prototype.mergeMutateDOMOperations = function () {
  this.nodes.forEach((node) => {
    var mutateDOMOperations = node.operations.filter(
      (op) => op.operation === Operation.MUTATE_DOM);

    var newMutateDOMOperations = [];

    mutateDOMOperations.forEach((op) => {
      var [ newUpperLeft, newLowerRight ] = Point.getPointsFromArea(op.area);

      for (var i = 0; i < newMutateDOMOperations.length; ++i) {
        var [ upperLeft, lowerRight ] =
          Point.getPointsFromArea(newMutateDOMOperations[i].area);

        // If `op` is fully contained in `other`, then skip.
        if (upperLeft.isAboveEq(newUpperLeft) &&
            upperLeft.isLeftOfEq(newUpperLeft) &&
            lowerRight.isBelowEq(newLowerRight) &&
            lowerRight.isRightOfEq(newLowerRight)) {
          return;
        }

        // TODO: Merge if one is an extension of another...
      }

      newMutateDOMOperations.push(op);
    });

    node.operations =
      node.operations.filter((op) => op.operation !== Operation.MUTATE_DOM)
                     .concat(newMutateDOMOperations);
  });

  return this;
};

/**
 * If there exists an interval/timer event w, which is a successor of an
 * interval/timer event v, which is the only successor of an event u, and the
 * effects of v is empty (i.e., getNodeFromEventId(v).operations is empty),
 * then this method eliminates the event v, and connects u to w.
 */
EventGraph.prototype.reduce = function () {
  var graph = this;

  var toBeRemoved = new SmartSet(this.nodes.filter((node) => {
    if (node.operations.length !== 0 || node.predecessors.size !== 1 ||
        node.successors.size !== 1) {
      // This node cannot possibly be the node `v`.
      return false;
    }

    var predecessor = node.predecessors.first();
    var successor = node.successors.first();

    return predecessor.getLabels(node) === JoinKind.INTERVAL &&
           node.getLabels(successor) === JoinKind.INTERVAL;
  }));

  toBeRemoved.forEach((node) => graph.deleteNode(node));

  return this;
};

// Creates an edge from the predecessors of node to the successors of node, and
// removes all edges from the predecessors to node, and from the node to all of
// its successors.
EventGraph.prototype.deleteNode = function (node) {
  node.predecessors.forEach((predecessor) => {
    predecessor.removeSuccessor(node);
    node.successors.forEach((successor) =>
      predecessor.addSuccessor(successor, node.getLabels(successor)));
  });

  node.successors.forEach((successor) => node.removeSuccessor(successor));

  this.eventIdToNode.delete(node.eventId);
  this.nodes = this.nodes.filter((other) => other !== node);
};

EventGraph.prototype.removeSubtreesWithNoActions = function () {
  // Make a bottom-up traversal of the tree rooted at `root`. If all nodes
  // reachable from a given node do not have any actions, then this node gets
  // removed.
  var removed = new Set();
  var visit = function (node) {
    var subtreesHaveNoActions =
      node.successors.toArray().reduce(
        (acc, successor) => visit(successor) && acc, /*initialValue=*/true);

    var subtreeHasNoActions =
      node.cancelledBy || (
        subtreesHaveNoActions &&
        node.operations.every((op) => op.operation === Operation.CANCEL));

    if (!this.isRoot(node) && subtreeHasNoActions) {
      if (removed.has(node)) {
        // Already removed previously.
      } else {
        // All successors should have been removed.
        debugging.assertEq(node.successors.length, 0);

        // Delete this node from the event graph.
        debugging.assert(this.eventIdToNode.delete(node.eventId));
        this.nodes.splice(this.nodes.indexOf(node), 1);

        // Remove the reachability of this node from its predecessors.
        node.predecessors.forEach((predecessor) => {
          debugging.assert(predecessor.labels.delete(node));
          debugging.assert(predecessor.successors.delete(node));
        });

        if (node.cancelledBy) {
          node.cancelledBy.operations = node.cancelledBy.operations.filter(
            (op) => !(op.operation === Operation.CANCEL &&
                      op.v === node.eventId));
        }

        removed.add(node);
      }
    }

    return subtreeHasNoActions;
  }.bind(this);

  this.findCancelled().forEach(visit);
  this.findRoots().forEach(visit);

  return this;
};

EventGraph.prototype.toDot = function () {
  var dot = ['digraph G {'];

  this.nodes.forEach((node) => {
    // Create node with label.
    var labels = node.operations
      .filter((op) => op.operation === Operation.MUTATE_DOM)
      .map((op) => util.format(
        'mutate-dom[x=%s, y=%s, w=%s, h=%s]',
        op.area.x, op.area.y, op.area.width, op.area.height));

    if (labels.length === 0) {
      dot.push(util.format(
        '  n%s [fillcolor="%s", label="%s", shape="box", style="%s"];',
        node.eventId,
        (node.isAjaxResponse || node.isScriptExecution)
          ? '#1997c6' : 'lightgrey',
        'event ' + node.eventId,
        (node.isDerivedFromAjax || node.isDerivedFromDynamicallyLoadedScript)
          ? 'filled,rounded' : 'rounded'));
    } else {
      dot.push(util.format(
        '  n%s [fillcolor="%s", label="{ %s | %s }", shape="record", style="%s"];',
        node.eventId,
        (node.isAjaxResponse || node.isScriptExecution)
          ? '#1997c6' : 'lightgrey',
        'event ' + node.eventId,
        labels.join('\\n'),
        (node.isDerivedFromAjax || node.isDerivedFromDynamicallyLoadedScript)
          ? 'filled,rounded' : 'rounded'));
    }

    // Create labeled edges from node to successors.
    node.successors.forEach((successor) =>
      dot.push(util.format('  n%s -> n%s [label=%s];',
        node.eventId, successor.eventId,
        JSON.stringify(node.getLabels(successor)))));

    // Create "cancel edges" from node to cancelled events.
    node.operations
        .filter((op) => op.operation === Operation.CANCEL)
        .forEach((op) => {
          debugging.assertEq(op.u, node.eventId);
          dot.push(util.format('  n%s -> n%s [label="cancel", color="red"]',
                               node.eventId, op.v));
        });
  });

  dot.push('}');
  return dot.join('\n');
};

/**
 * Builds a graph from the trace, where fork/join operations gives rise to the
 * predecessor/successor relation.
 */
function build(trace) {
  // A map from node ID to node.
  var eventIdToNode = new Map();

  var getOrMakeNode = (eventId, op) => {
    var node = null;
    if (eventIdToNode.has(eventId)) {
      node = eventIdToNode.get(eventId);
    } else {
      node = new GraphNode(eventId);
      eventIdToNode.set(eventId, node);
    }
    if (eventIdOfOperation(op) === eventId) {
      if (op.operation === Operation.CANCEL ||
          op.operation === Operation.MUTATE_DOM) {
        node.operations.push(op);
      }
    } else {
      if (op.operation === Operation.CANCEL) {
        node.cancelledBy = getOrMakeNode(op.u, {});
      }
      if (op.operation === Operation.FORK) {
        if (op.kind === ForkKind.AJAX_REQUEST) {
          node.isDerivedFromAjax = true;
        } else if (op.kind === ForkKind.LOAD_SCRIPT) {
          node.isScriptExecution = true;
          node.isDerivedFromDynamicallyLoadedScript = true;
        }
      }
      if (op.operation == Operation.JOIN) {
        switch (op.kind) {
          case JoinKind.AJAX_ERROR:
          case JoinKind.AJAX_HEADERS_RECEIVED:
          case JoinKind.AJAX_LOADING:
          case JoinKind.AJAX_PROGRESS:
            node.isDerivedFromAjax = true;
            break;

          case JoinKind.AJAX_DONE:
          case JoinKind.AJAX_LOADED:
            node.isAjaxResponse = true;
            node.isDerivedFromAjax = true;
            break;
        }
      }
    }
    return node;
  };

  if (trace.length > 0) {
    trace.forEach((x) => {
      if (x.operation === Operation.FORK || x.operation === Operation.JOIN) {
        var u = getOrMakeNode(x.u, x);
        var v = getOrMakeNode(x.v, x);
        if (x.operation === Operation.JOIN) {
          var tmp = u;
          u = v;
          v = tmp;
        }
        var label = x.kind;
        if (x.operation === Operation.FORK) {
          switch (x.kind) {
            case ForkKind.INTERVAL:
            case ForkKind.TIMER:
              label += ' (' + x.delay + 'ms)';
              break;
          }
        }
        u.addSuccessor(v, label);
      } else {
        getOrMakeNode(eventIdOfOperation(x), x);
        if (eventIdOfOperation(x) === x.u && typeof x.v === 'number') {
          getOrMakeNode(x.v, x);
        }
        if (eventIdOfOperation(x) === x.v && typeof x.u === 'number') {
          getOrMakeNode(x.u, x);
        }
      }
    });
  } else {
    // Create a single node corresponding to the root event.
    getOrMakeNode(0, {});
  }

  return {
    eventIdToNode: eventIdToNode,
    nodes: Array.from(eventIdToNode.values())
  };
}

module.exports = EventGraph;
