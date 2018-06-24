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

var child_process = require('child_process');

function dot2png(data, timeout=10000) {
  return new Promise((resolve, reject) => {
    var dot = child_process.spawn('dot', ['-Tpng']);

    var buffers = [];
    dot.stdout.on('data', (data) => buffers.push(data));
    dot.stderr.on('data', (data) => console.log(`stderr: ${data}`));

    dot.on('close', (code) => resolve(Buffer.concat(buffers)));

    dot.stdin.setEncoding('utf-8');
    dot.stdin.write(data);
    dot.stdin.end();

    setTimeout(function () {
      dot.kill();
      resolve(null);
    }, timeout);
  });
}

module.exports = dot2png;
