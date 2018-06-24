#!/usr/bin/env node

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

var acorn = require('acorn');

function isJavaScript(input) {
  try {
    acorn.parse(input);
    return true;
  } catch (e) {
    return false;
  }
}

if (require.main === module) {
  var input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', function (data) {
    input += data;
  });
  process.stdin.on('end', function () {
    if (!isJavaScript(input)) {
      console.error('SyntaxError');
      process.exit(1);
    }
  });
}
