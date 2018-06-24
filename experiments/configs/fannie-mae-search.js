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
      "description": "Enter \"hel\" into the search form field",
      "selector": "input.app-search",
      "type": "keyup",
      "event": {
        "code": "KeyL",
        "ctrlKey": false,
        "key": "l",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 76
      },
      "prerequisites": [
        {
          "selector": "input.app-search",
          "type": "set-text",
          "value": "hel"
        }
      ]
    },
    {
      "description": "Enter \"hell\" into the search form field",
      "selector": "input.app-search",
      "type": "keyup",
      "event": {
        "code": "KeyL",
        "ctrlKey": false,
        "key": "l",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 76
      },
      "prerequisites": [
        {
          "selector": "input.app-search",
          "type": "set-text",
          "value": "hell"
        }
      ]
    }
  ]
};
