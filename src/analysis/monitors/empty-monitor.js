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

function EmptyMonitor() {}


// Scripts


EmptyMonitor.prototype.onEnterScript = function () {};
EmptyMonitor.prototype.onExitScript = function () {};

EmptyMonitor.prototype.shouldBlockCurrentScript = () => false;
EmptyMonitor.prototype.shouldBlockScriptResponse = () => false;

// Ajax


EmptyMonitor.prototype.onAjaxRequest = function () {};
EmptyMonitor.prototype.onAjaxAbort = function () {};
EmptyMonitor.prototype.onEnterAjaxResponse = function () {};
EmptyMonitor.prototype.onExitAjaxResponse = function () {};
EmptyMonitor.prototype.onEnterAjaxError = function () {};
EmptyMonitor.prototype.onExitAjaxError = function () {};
EmptyMonitor.prototype.onEnterAjaxAbort = function () {};
EmptyMonitor.prototype.onExitAjaxAbort = function () {};

EmptyMonitor.prototype.shouldBlockAjaxResponse = () => false;


// Timers


EmptyMonitor.prototype.onTimerCreation = function () {};
EmptyMonitor.prototype.onTimerDeletion = function () {};
EmptyMonitor.prototype.onEnterTimerCallback = function () {};
EmptyMonitor.prototype.onExitTimerCallback = function () {};


// Promises


EmptyMonitor.prototype.onPromiseCreation = function () {};
EmptyMonitor.prototype.onPromiseResolution = function () {};
EmptyMonitor.prototype.onPromiseRejection = function () {};

// TODO(saba): Should register a method for `onPromiseRejection` here.


// Resources

EmptyMonitor.prototype.onResourceRequest = function () {};
EmptyMonitor.prototype.onResourceResponse = function () {};

// Other


EmptyMonitor.prototype.onRegisterEventListener = function () {};
EmptyMonitor.prototype.onDetachEventListener = function () {};
EmptyMonitor.prototype.onEnterEventListener = function () {};
EmptyMonitor.prototype.onExitEventListener = function () {};
EmptyMonitor.prototype.onDOMMutation = function () {};


module.exports = EmptyMonitor;
