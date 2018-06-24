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

var instrumentJavaScript = require('./instrument-js.js');

var _apply = Function.prototype.apply;
var _call = Function.prototype.call;
var _eval = eval;
var _Function = Function;

function callAsConstructor(Constructor, args) {
  if (args.length === 0) {
    return new Constructor();
  }
  if (args.length === 1) {
    return new Constructor(args[0]);
  }
  if (args.length === 2) {
    return new Constructor(args[0], args[1]);
  }
  if (args.length === 3) {
    return new Constructor(args[0], args[1], args[2]);
  }
  if (args.length === 4) {
    return new Constructor(args[0], args[1], args[2], args[3]);
  }
  if (args.length === 5) {
    return new Constructor(args[0], args[1], args[2], args[3], args[4]);
  }

  var a = [];
  for (var i = 0; i < args.length; i++) {
    a[i] = 'args[' + i + ']';
  }
  var eval = _eval;
  return eval('new Constructor(' + a.join() + ')');
}

function install() {
  var J$ = window.J$ || (window.J$ = {});

  J$.isInsideEval = 0;

  // Online instrumentation.
  J$.instrument = (code) => {
    if (typeof code === 'string') {
      return instrumentJavaScript(code, {
        allowReturnOutsideFunction: true,
        isEval: true,
        isExternalScript: false,
        isInlineScript: false,
        url: 'N/A'
      });
    }
    return code;
  };

  J$.indirectEval = (code) => {
    return _eval(code);
  };

  // Function invocation callback.
  J$.F = (base, f, args, isConstructor, isMethod) => {
    var methodName = null;
    if (isMethod) {
        methodName = f;
        f = base[methodName];
    } else {
        base = (function () { return this; })();
    }

    var aret = J$.analysis.invokeFunPre(
      /*iid=*/null, f, base, args, isConstructor, isMethod,
      /*functionIid=*/null, /*functionSid=*/null);

    if (aret) {
      if (aret.skip) {
        if ('val' in aret) {
          return aret.val;
        }
        return;
      }

      base = aret.base;
      f = aret.f;
      args = aret.args;
    }

    var result;
    var _f = f === _apply || f === _call ? base : f;
    if (_f === _eval) {
      var code = args[0];
      if (f === _apply) {
        code = args[1][0];
      } else if (f === _call) {
        code = args[1];
      }
      code = J$.instrument(code);
      ++J$.isInsideEval;
      try {
        result = _eval(code);
      } finally {
        --J$.isInsideEval;
      }
    } else if (f === _Function && isConstructor) {
      var code = '(function (' + args.slice(0, args.length-1).join(', ') + ') { ' + args[args.length-1] + ' })';
      code = J$.instrument(code);
      var eval = _eval;
      var f = eval(code);
      result = function () {
        ++J$.isInsideEval;
        try {
          return f.apply(this, arguments);
        } finally {
          --J$.isInsideEval;
        }
      };
    } else if (isConstructor) {
      result = callAsConstructor(f, args);
    } else {
      result = f.apply(base, args);
    }

    J$.analysis.invokeFun(
      /*iid=*/null, /*f=*/f, /*base=*/base, /*args=*/args, result,
      /*isConstructor=*/isConstructor, /*isMethod=*/isMethod,
      /*functionIid=*/null, /*functionSid=*/null);

    return result;
  };

  // Property read callback.
  J$.G = (base, offset, isComputed, isOpAssign, isMethodCall) => {
    var aret = J$.analysis.getFieldPre(
      /*iid=*/null, base, offset, isComputed, isOpAssign, isMethodCall);
    if (aret) {
      if (aret.skip) {
        if ('result' in aret) {
          return aret.result;
        }
        return undefined;
      }

      base = aret.base;
      offset = aret.offset;
    }
    return base[offset];
  };

  // Property assignment callback.
  J$.P = (base, offset, val) => {
    var aret = J$.analysis.putFieldPre(/*iid=*/null, base, offset, val);
    if (aret) {
      if (aret.skip) {
        if ('val' in aret) {
          return aret.val;
        }
        return val;
      }

      base = aret.base;
      offset = aret.offset;
      val = aret.val;
    }
    return base[offset] = val;
  };

  // Script ready callback.
  J$.S = (executor) => J$.analysis.scriptReady(executor);

  // Script enter callback.
  J$.Se = (origFileName) => J$.analysis.scriptEnter(/*iid=*/null, /*val=*/null,
                                                    origFileName);

  // Script exit callback.
  J$.Sr =
    () => J$.analysis.scriptExit(/*iid=*/null, /*wrappedExceptionVal=*/null);

  // Literal callback.
  J$.T = (val, getters, setters) => {
    if (getters) {
      getters.forEach(
        (name) => J$.T(Object.getOwnPropertyDescriptor(val, name).get));
    }

    if (setters) {
      setters.forEach(
        (name) => J$.T(Object.getOwnPropertyDescriptor(val, name).set));
    }

    J$.analysis.literal(/*iid=*/null, val, /*hasGetterSetter=*/null,
                        /*isGetter=*/null, /*isSetter=*/null,
                        /*objectKeys=*/null);
    return val;
  };
}

module.exports = {
  install: install
};
