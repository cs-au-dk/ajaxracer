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
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var util = require('util');
var walk = require('walk');

var root = path.join(__dirname, '../..');

function TRUE_PREDICATE() {
  return true;
}

/**
 * Recursively finds all the files inside the directory `root`,
 * for which the function `predicate` returns true.
 *
 * Returns a promise, which resolves to a list of files.
 */
function list(root, predicate = TRUE_PREDICATE) {
  debugging.assert(typeof predicate === 'function',
                   'Predicate must be a function');

  return new Promise((resolve, reject) => {
    var entities = [];
    var walker = walk.walk(root, { followLinks: false });

    walker.on('directory', function (root, stat, next) {
      // Add this directory to the list of entities
      var dirname = path.join(root, stat.name);
      if (predicate(dirname, 'directory')) {
        entities.push(dirname);
      }
      next();
    });

    walker.on('file', function (root, stat, next) {
      // Add this file to the list of entities
      var filename = path.join(root, stat.name);
      if (predicate(filename, 'file')) {
        entities.push(filename);
      }
      next();
    });

    walker.on('end', () => resolve(entities));
  });
}

function listDirectories(root, predicate = TRUE_PREDICATE) {
  return list(root, (name, type) => type === 'directory' && predicate(name));
}

function listFiles(root, predicate = TRUE_PREDICATE) {
  return list(root, (name, type) => type === 'file' && predicate(name));
}

function readJsonSync(filename) {
  return JSON.parse(fs.readFileSync(filename));
}

function writeFileSync(filename, data, log) {
  if (log) {
    console.log(util.format('Writing file: %s', path.relative(root, filename)));
  }
  fs.writeFileSync(filename, data);
}

function writeJsonSync(filename, object, log) {
  if (log) {
    console.log(util.format('Writing file: %s', path.relative(root, filename)));
  }
  fs.writeFileSync(filename, JSON.stringify(object, undefined, 2));
}

/**
 * Stores `data` at `out/site/result.json`.
 * Returns a promise that is resolved once `data` has been saved.
 */
function writeTo(filename, verbose) {
  return (data) => new Promise((resolve, reject) => {
    mkdirp(path.dirname(filename), function (err) {
      if (verbose) {
        console.log(util.format('Saving file to %s', filename));
      }
      if (err) {
        reject(err);
      } else {
        fs.writeFile(filename, data, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

module.exports = {
  list: list,
  listDirectories: listDirectories,
  listFiles: listFiles,
  readJsonSync: readJsonSync,
  writeFileSync: writeFileSync,
  writeJsonSync: writeJsonSync,
  writeTo: writeTo
};
