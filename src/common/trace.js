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

var ForkKind = {
  AJAX_REQUEST: 'ajax-request',
  ANIMATION_FRAME_REQUEST: 'animation-frame-request',
  IDLE_CALLBACK_REQUEST: 'idle-callback-request',
  IMMEDIATE_TIMER: 'immediate-timer',
  INTERVAL: 'interval',
  LOAD_IMG: 'load-img',
  LOAD_RESOURCE: 'load-resource',
  LOAD_SCRIPT: 'load-script',
  PROMISE_REJECT: 'promise-reject',
  PROMISE_RESOLVE: 'promise-resolve',
  TIMER: 'timer'
};

var JoinKind = {
  AJAX_ERROR: 'ajax-error',
  AJAX_HEADERS_RECEIVED: 'ajax-headers-received',
  AJAX_LOADED: 'ajax-loaded',
  AJAX_LOADING: 'ajax-loading',
  AJAX_PROGRESS: 'ajax-progress',
  AJAX_DONE: 'ajax-done',
  INTERVAL: 'interval',
  PROMISE_CATCH: 'promise-catch-handler',
  PROMISE_THEN: 'promise-then-handler'
};

var Operation = {
  CANCEL: 'cancel',
  FORK: 'fork',
  JOIN: 'join',
  MUTATE_DOM: 'mutate-dom',
  ROOT: 'root'
};

/**
 * Returns true if the actions `action` and `otherAction` are conflicting.
 * This is true, for example, if both actions update the same part of the UI.
 */
function areActionsConflicting(action, otherAction) {
  if (action.operation === Operation.MUTATE_DOM &&
      otherAction.operation === Operation.MUTATE_DOM) {
    return areasOverlap(action.area, otherAction.area);
  }
  return false;
}

function areasOverlap(area, other) {
  var rect1 = {
    x1: area.x,
    y1: area.y,
    x2: area.x + area.width,
    y2: area.y + area.height
  };
  var rect2 = {
    x1: other.x,
    y1: other.y,
    x2: other.x + other.width,
    y2: other.y + other.height
  };

  // If one rectangle is on left side of other.
  if (rect1.x2 < rect2.x1 || rect2.x2 < rect1.x1) {
    return false;
  }

  // If one rectangle is above other.
  if (rect1.y2 < rect2.y1 || rect2.y2 < rect1.y1) {
    return false;
  }

  return true;
}

module.exports = {
  areActionsConflicting: areActionsConflicting,
  ForkKind: ForkKind,
  JoinKind: JoinKind,
  Operation: Operation
};
