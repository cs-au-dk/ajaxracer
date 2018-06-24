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

module.exports = {
  "manualEventSequence": [
    {
      "description": "Search for the term \"a\"",
      "selector": "#inputTopSearchField",
      "type": "keyup",
      "event": {
        "code": "KeyA",
        "ctrlKey": false,
        "key": "a",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 65
      },
      "prerequisites": [
        {
          "selector": "#inputTopSearchField",
          "type": "set-text",
          "value": "a"
        }
      ]
    },
    {
      "description": "Search for the term \"ab\"",
      "selector": "#inputTopSearchField",
      "type": "keyup",
      "event": {
        "code": "KeyB",
        "ctrlKey": false,
        "key": "b",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 66
      },
      "prerequisites": [
        {
          "selector": "#inputTopSearchField",
          "type": "set-text",
          "value": "ab"
        }
      ]
    }
  ]
};
