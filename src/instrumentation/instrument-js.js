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
var debugging = require('../common/debugging.js');

// External
var acorn = require('acorn');
var esotope = require('esotope');
var jsesc = require('jsesc');
var falafel = require('falafel');
var util = require('util');

// This function takes a piece of JavaScript (`input`) and instruments it.
function instrumentJavaScript(input, options) {
  debugging.assertEq(typeof options, 'object');
  debugging.assertEq(typeof options.allowReturnOutsideFunction, 'boolean');
  debugging.assertEq(typeof options.isExternalScript, 'boolean');
  debugging.assertEq(typeof options.isInlineScript, 'boolean');
  debugging.assert(options.url === null || typeof options.url === 'string');

  return instrumentPropertyReadsAndWrites(input, {
    allowReturnOutsideFunction: options.allowReturnOutsideFunction,
    injectScriptReadyHook: options.isExternalScript,
    injectScriptEnterExitHooks:
      options.isExternalScript || options.isInlineScript,
    url: options.url
  });
}

var ExpressionType = {
  AssignmentExpression: 'AssignmentExpression',
  CallExpression: 'CallExpression',
  FunctionExpression: 'FunctionExpression',
  Literal: 'Literal',
  MemberExpression: 'MemberExpression',
  NewExpression: 'NewExpression',
  ObjectExpression: 'ObjectExpression',
  SequenceExpression: 'SequenceExpression'
};

var StatementType = {
  ForStatement: 'ForStatement',
  ForInStatement: 'ForInStatement',
  ForOfStatement: 'ForOfStatement',
  FunctionDeclaration: 'FunctionDeclaration',
  VariableDeclaration: 'VariableDeclaration'
};

/**
 * This function instruments selected property assignments in a piece of
 * JavaScript (`input`).
 *
 * The transformation is a follows:
 * - e1.f = e2 => J$.P(e1, 'f', e2), and
 * - e1[e2] = e3 => J$.P(e1, e2, e3).
 *
 * Note: This function does not transform property assigments,
 * where the operator is not `=` (e.g., `+=`).
 */
function instrumentPropertyReadsAndWrites(input, options) {
  function transform(node, update) {
    if (node.type === ExpressionType.MemberExpression &&
        (node.parent.type !== ExpressionType.AssignmentExpression ||
         node !== node.parent.left) &&
        (node.parent.type !== ExpressionType.CallExpression ||
         node !== node.parent.callee) &&
        !node.computed) {
      var propertyName = node.property.source();
      if (propertyName === 'currentScript' || propertyName === 'style') {
        update(instrumentPropertyRead(node));
      }
    } else if (node.type === ExpressionType.AssignmentExpression &&
        node.operator === '=' &&
        node.left.type === ExpressionType.MemberExpression) {
      update(instrumentPropertyWrite(node));
    } else if (node.type === ExpressionType.CallExpression ||
               node.type === ExpressionType.NewExpression) {
      update(instrumentCall(node, options.injectScriptReadyHook));
    } else if (node.type === ExpressionType.FunctionExpression) {
      if (node.parent.type === 'Property' &&
          (node.parent.kind === 'get' || node.parent.kind === 'set')) {
        // Cannot be wrapped without introducing a syntax error,
        // handled by J$.T.
      } else {
        update(instrumentLiteral(node));
      }
    } else if (node.type === ExpressionType.ObjectExpression) {
      update(instrumentLiteral(node));
    } else if (node.type === ExpressionType.Literal) {
      if (typeof node.value === 'string') {
        var scriptIdx = node.value.indexOf('</scr' + 'ipt>');
        if (scriptIdx >= 0) {
          var left = node.value.substring(0, scriptIdx+4);
          var right = node.value.substring(scriptIdx+4);

          var quotes = node.value[0] === '\'' ? 'single' : 'double';
          var sanitized =
            jsesc(left, { quotes: quotes, escapeEtago: true, wrap: true }) + '+' +
            jsesc(right, { quotes: quotes, escapeEtago: true, wrap: true })
          update(sanitized);
        }
      }
    } else if (node.type === ExpressionType.SequenceExpression) {
      update('(' + node.source() + ')'); // Not added by falafel?
    } else if (node.type === StatementType.FunctionDeclaration) {
      // Rewrite "... function f() {}" into "var f = function f() {} ...". This
      // ensures that functions are not declared using let bindings, which can
      // potentially lead to syntax errors.
      if (node.funcDepth === 1) {
        declarations.push(util.format('var %s = window.%s;',
                                      node.id.name, node.id.name));
        lines.push(util.format('%s = J$.T(%s);', node.id.name, node.source()));
        update('');
      } else {
        update(util.format('%sJ$.T(%s);', node.source(), node.id.name));
      }
    } else if (node.type === StatementType.VariableDeclaration) {
      if (node.funcDepth === 0) {
        var decls = [];
        var assignments = [];
        for (var i = 0, n = node.declarations.length; i < n; ++i) {
          var decl = node.declarations[i];
          var id = decl.id.source();
          decls.push(id + ' = window.' + id);
          if (decl.init) {
            assignments.push(id + ' = ' + decl.init.source());
          }
        }
        declarations.push('var ' + decls.join(', ') + ';');
        if (assignments.length) {
          // Only add a trailing semicolon if it is not a variable declaration in a for statement
          var trailingSemicolon = node.parent.type === StatementType.ForStatement && node === node.parent.init ? '' : ';';
          update(assignments.join(', ') + trailingSemicolon);
        } else if (node.parent.type === StatementType.ForInStatement || node.parent.type === StatementType.ForOfStatement) {
          update(node.declarations[0].id.source());
        } else {
          update('');
        }
      }
    }
  }

  try {
    // The falafel library calls the `transform` function for every node in the program
    var ast = acorn.parse(input, { allowReturnOutsideFunction: true });
    var pp = esotope.generate(ast, { comment: true });
    var lines = [];
    var declarations = [];
    lines.push(falafel({
      allowReturnOutsideFunction: options.allowReturnOutsideFunction,
      source: pp,
      visit: function (node) {
        if (node.type === StatementType.FunctionDeclaration ||
            node.type === ExpressionType.FunctionExpression) {
          node.funcDepth = (node.parent.funcDepth || 0) + 1;
        } else if (node.parent) {
          node.funcDepth = node.parent.funcDepth;
        } else {
          node.funcDepth = 0;
        }
      }
    }, transform).toString().trim());
    var code = lines.join('\n');
    if (options.injectScriptEnterExitHooks) {
      // Insert calls to `onEnterScript()` and `onExitScript()`.
      var tmp =
        [util.format('J$.Se(%s);', JSON.stringify(options.url)), 'try {'];
      if (!options.injectScriptReadyHook) {
        tmp = tmp.concat(declarations);
      }
      tmp.push(code, '} finally {', 'J$.Sr();', '}');
      code = tmp.join('\n');
    } else {
      code = declarations.concat(code).join('\n');
    }
    if (options.injectScriptReadyHook) {
      // Insert call to `onScriptReady()`.
      code = declarations.concat([
        'J$.S(function () {',
        code,
        '});'
      ]).join('\n');
    }
    return code;
  } catch (e) {
    if (e.name === 'SyntaxError') {
      return 'throw new SyntaxError(' + jsesc(e.message, { quotes: 'single', escapeEtago: true, wrap: true }) + ');';
    }
    console.error('Failure during script instrumentation:', e.message + ' (' + e.name + ').');
    console.error('Source:', input);
    throw e;
  }
}

function instrumentCall(node, hasBeenWrappedInClosure) {
  debugging.assert(node.type === ExpressionType.CallExpression ||
                   node.type === ExpressionType.NewExpression);

  if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
    var isTopLevel = node.funcDepth === 0;
    if (hasBeenWrappedInClosure && isTopLevel) {
      // Change to an indirect eval.
      return util.format('J$.indirectEval(J$.instrument(%s))',
                         node.arguments[0].source());
    }
    return util.format('eval(J$.instrument(%s))', node.arguments[0].source());
  }

  var receiver = null;
  var fun = null;
  var args = (node.arguments || []).map(function (arg) {
    return arg.source();
  });

  var isMethod = node.callee.type === 'MemberExpression';
  var isConstructor = node.type === 'NewExpression';

  if (isMethod) {
    receiver = node.callee.object.source();
    fun = node.callee.computed
      ? node.callee.property.source()
      : jsesc(node.callee.property.name, { quotes: 'single', escapeEtago: true, wrap: true });
  } else {
    fun = node.callee.source();
  }

  return util.format('J$.F(%s, %s, [%s], %s, %s)',
    receiver, fun, args.join(', '), isConstructor, isMethod);
}

function instrumentLiteral(node) {
  var getters = null;
  var setters = null;

  if (node.type === ExpressionType.ObjectExpression) {
    getters = node.properties.filter((property) => property.kind === 'get')
                             .map((property) => property.key.name);
    setters = node.properties.filter((property) => property.kind === 'set')
                             .map((property) => property.key.name);

    getters = getters.length > 0 ? JSON.stringify(getters) : null;
    setters = setters.length > 0 ? JSON.stringify(setters) : null;
  }

  if (setters) {
    return util.format('J$.T(%s, %s, %s)', node.source(), getters, setters);
  }
  if (getters) {
    return util.format('J$.T(%s, %s)', node.source(), getters);
  }
  return util.format('J$.T(%s)', node.source());
}

function instrumentPropertyRead(node) {
  debugging.assertFalse(node.computed);
  return util.format('J$.G(%s, \'%s\')', node.object.source(),
                     node.property.source());
}

function instrumentPropertyWrite(node) {
  var left = node.left;
  if (left.computed) {
    // Conservatively instrument assignments,
    // where we do not know which property is being assigned
    return util.format('J$.P(%s, %s, %s)',
      left.object.source(), left.property.source(), node.right.source());
  }

  var property = left.property.source();
  return util.format('J$.P(%s, \'%s\', %s)',
    left.object.source(), property, node.right.source());
}

module.exports = instrumentJavaScript;
