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
var debugging = require('../../common/debugging.js');
var introspection = require('../utils/introspection.js');
var List = require('../stdlib/list.js');
var misc = require('../utils/misc.js');
var natives = require('../utils/natives.js');

// External
var util = require('util');

function install(analysis) {
  function handlePromiseThen(onFulfilled, onRejected) {
    var base = this;

    // Sometimes then() is called from the native side, although the program
    // does not use promises at all. When this seems to happen, simply forward
    // to the native then().
    if (misc.isNative(base)) {
      debugging.assert(
        !onFulfilled || onFulfilled.toString().indexOf('native') >= 0);
      debugging.assert(
        !onRejected || onRejected.toString().indexOf('native') >= 0);
      return natives.refs.Promise.then.call(base, onFulfilled, onRejected);
    }

    var promiseId = analysis.nextPromiseId++;
    var shadow = { promiseId: promiseId };
    var readsResolveOrReject = true;
    var registrationOptions = {
      promiseId: promiseId,
      shadow: shadow,
      shadowOfTarget: misc.getShadow(base)
    };

    // Signal promise creation.
    var resolutionOptions =
      analysis.notify('onPromiseCreation',
                      [promiseId, shadow, readsResolveOrReject]);

    // Handle event handler registration of `onFulfilled`.
    if (typeof onFulfilled !== 'function') {
      onFulfilled = (value) => value;
    }

    var thenEnterOptions =
      analysis.notify('onRegisterEventListener',
                      [base, 'then', onFulfilled, registrationOptions]);

    var onFulfilledWrapper = function (resolve, reject, value) {
      var exitOptions = analysis.notify('onEnterEventListener',
                                        [this, null], thenEnterOptions);
      try {
        var result = onFulfilled.call(this, value);
        if (result instanceof natives.refs.Promise.ref) {
          natives.refs.Promise.then.call(result, resolve, reject);
        } else {
          resolve(value);
        }
      } catch (error) {
        reject(error);
      } finally {
        analysis.notify('onExitEventListener', [], exitOptions);
      }
    }

    // Handle event handler registration of `onRejected`.
    if (typeof onRejected !== 'function') {
      onRejected = (error) => {
        throw error;
      };
    }

    var catchEnterOptions =
      analysis.notify('onRegisterEventListener',
                      [base, 'catch', onRejected, registrationOptions]);

    var onRejectedWrapper = function (resolve, reject, error) {
      var exitOptions = analysis.notify('onEnterEventListener',
                                        [this, null], catchEnterOptions);
      try {
        var result = onRejected.call(this, error);
        if (result instanceof natives.refs.Promise.ref) {
          natives.refs.Promise.then.call(
            result, resolve, () => debugging.assert(false));
        } else {
          // Resolve since this catch event handler successfully caught the
          // error.
          resolve(result);
        }
      } catch (reason) {
        reject(reason);
      } finally {
        analysis.notify('onExitEventListener', [], exitOptions);
      }
    };

    // Returns a new promise that gets resolved when the promise returned by
    // `onFulfilledWrapper` has been resolved (or immediately, if no promise
    // is returned).
    var promise = shadow.shadowed = new natives.refs.Promise.ref(
      misc.makeWrapper((_resolve, _reject) => {
        function resolve(value) {
          analysis.notify('onPromiseResolution', [promiseId, shadow],
                          resolutionOptions);
          _resolve(value);
        }

        function reject(error) {
          analysis.notify('onPromiseRejection', [promiseId, shadow],
                          resolutionOptions);
          _reject(error);
        }

        natives.refs.Promise.then.call(
          base,
          /*onFulfilled=*/
          (value) => onFulfilledWrapper.call(this, resolve, reject, value),
          /*onRejected=*/
          (error) => onRejectedWrapper.call(this, resolve, reject, error));
      })
    );
    misc.markNotNative(promise);
    misc.setShadow(promise, shadow);
    return promise;
  }

  /**
   * Replace the Promise.prototype.then function with a custom one.
   */
  window.Promise.prototype.then = handlePromiseThen;

  window.Promise.prototype.catch = function (handler) {
    return handlePromiseThen.call(this, undefined, handler);
  };

  /**
   * Below we overwrite the Promise constructor, to intercept whenever a new
   * promise is created by the web application, and also to intercept whenever
   * the web application resolves or rejects the newly created promise.
   *
   * (Note that it is important to update `Promise.prototype` before
   * overwriting`window.Promise`.)
   */
  window.Promise = function (executor) {
    // Sanity check: the argument `executor`, which is provided by the web
    // application, should always be a function.
    debugging.assertEq(typeof executor, 'function');

    var promiseId = analysis.nextPromiseId++;

    // Create a new "shadow object" for the newly created promise. This object
    // can be used to store metadata about the newly created promise.
    var shadow = { promiseId: promiseId };

    // Check if the function `executor` declares at least one parameter,
    // by inspecting the source code of the function. If the function does not
    // declare any parameters, then it is doubtful that the newly created
    // promise will ever be resolved or rejected. In that case, the
    // implementation should not wait for it to become resolved/rejected.
    var code = introspection.getSourceCode(executor);
    var readsResolveOrReject =
      introspection.getParameterNames(code).length >= 1 ||
      introspection.isNativeFunction(code);

    // Invoke the high-level function "onPromiseCreation" on every monitor
    // (e.g., the LoadMonitor, and the EventMonitor), passing the variables
    // promise id, the shadow object, and the boolean `readsResolveOrReject`
    // as arguments.
    var resolutionOptions =
      analysis.notify('onPromiseCreation',
                      [promiseId, shadow, readsResolveOrReject]);

    // Now we create the new Promise object, as requested by the web
    // application. Instead of passing `executor` as an argument, we pass a
    // function, which enables the implementation to intercept whenver the
    // web application invokes `resolve` or `reject`.
    var promise = shadow.shadowed = new natives.refs.Promise.ref(
      misc.makeWrapper(function (resolve, reject) {
        // Invoke the `executor` function with functions that wrap `resolve`
        // and `reject, respectively.
        executor.call(
          this,
          /*resolve=*/
          (data) => {
            // When this line of code executes, the web application has invoked
            // the `resolve` function with `data` as argument. That means that
            // the promise is being resolved, so we notify every monitor.
            analysis.notify('onPromiseResolution', [promiseId, shadow],
                            resolutionOptions);

            // Now we resolve the actual promise, by calling the native
            // function `resolve`.
            return resolve(data);
          },
          /*reject=*/
          (err) => {
            // When this line of code executes, the web application has invoked
            // the `reject` function.
            analysis.notify('onPromiseRejection', [promiseId, shadow],
                            resolutionOptions);

            // Now we reject the actual promise, by calling the native
            // function `reject`.
            return reject(err);
          }
        );
      })
    );
    misc.markNotNative(promise);
    misc.setShadow(promise, shadow);
    return promise;
  };

  window.Promise.all = function (iterable) {
    debugging.assert(iterable instanceof Array);

    var promiseId = analysis.nextPromiseId++;
    var shadow = { promiseId: promiseId };
    var readsResolveOrReject = true;

    var resolutionOptions =
      analysis.notify('onPromiseCreation',
                      [promiseId, shadow, readsResolveOrReject]);

    var promise;
    if (iterable.length === 0) {
      promise =
        natives.refs.Promise.resolve.call(natives.refs.Promise.ref, []);
    } else {
      promise = natives.refs.Promise.then.call(
        natives.refs.Promise.all.call(natives.refs.Promise.ref, iterable),
        (value) => {
          analysis.notify('onPromiseResolution', [promiseId, shadow],
                          resolutionOptions);
          return value;
        },
        () => debugging.assert(false, 'Promise rejection not supported')
      );
    }
    misc.markNotNative(promise);
    misc.setShadow(promise, shadow);

    if (iterable.length === 0) {
      analysis.notify('onPromiseResolution', [promiseId, shadow],
                      resolutionOptions);
    }

    return promise;
  };

  window.Promise.reject = function (error) {
    if (error instanceof natives.refs.Promise.ref) {
      return error;
    }

    var promiseId = analysis.nextPromiseId++;
    var shadow = { promiseId: promiseId };
    var readsResolveOrReject = true;

    var options = analysis.notify('onPromiseCreation',
                                  [promiseId, shadow, readsResolveOrReject]);

    var promise =
      natives.refs.Promise.reject.call(natives.refs.Promise.ref, error);
    misc.markNotNative(promise);
    misc.setShadow(promise, shadow);

    analysis.notify('onPromiseRejection', [promiseId, shadow], options);

    return promise;
  };

  window.Promise.resolve = function (value) {
    if (value instanceof natives.refs.Promise.ref) {
      return value;
    }

    var promiseId = analysis.nextPromiseId++;
    var shadow = { promiseId: promiseId };
    var readsResolveOrReject = true;

    var options = analysis.notify('onPromiseCreation',
                                  [promiseId, shadow, readsResolveOrReject]);

    var promise =
      natives.refs.Promise.resolve.call(natives.refs.Promise.ref, value);
    misc.markNotNative(promise);
    misc.setShadow(promise, shadow);

    analysis.notify('onPromiseResolution', [promiseId, shadow], options);

    return promise;
  };

  /**
   * The `query` function returns a promise. Treat it as if it was a call to
   * the Promise constructor.
   */
  function getNativeWrapper(f, mustFinish) {
    return function () {
      var base = this;
      var args = new List(arguments, /*isArguments=*/true);

      var promiseId = analysis.nextPromiseId++;
      var shadow = { mustFinish: mustFinish, promiseId: promiseId };
      var readsResolveOrReject = true;

      var opts = analysis.notify('onPromiseCreation',
                                 [promiseId, shadow, readsResolveOrReject]);

      var promise = shadow.shadowed = new natives.refs.Promise.ref(
        misc.makeWrapper(function (resolve, reject) {
          var onCompleted = f.apply(base, args.getArray());

          natives.refs.Promise.then.call(
            onCompleted,
            /*resolve=*/
            (data) => {
              analysis.notify('onPromiseResolution', [promiseId, shadow], opts);
              return resolve(data);
            },
            /*reject=*/
            debugging.assertUnreachable
          );
        })
      );
      misc.markNotNative(promise);
      misc.setShadow(promise, shadow);
      return promise;
    };
  }

  window.Promise.race = getNativeWrapper(natives.refs.Promise.race, false);

  window.navigator.mediaDevices.enumerateDevices =
    getNativeWrapper(window.navigator.mediaDevices.enumerateDevices, true);

  window.navigator.permissions.query =
    getNativeWrapper(window.navigator.permissions.query, true);

  natives.refs.HTMLImageElement.ref.prototype.decode =
    getNativeWrapper(natives.refs.HTMLImageElement.decode, true);
}

module.exports = {
  install: install
};
