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
      "description": "Enter \"screwdriver\" into the search form field",
      "selector": "#search",
      "type": "keyup",
      "event": {
        "code": "KeyR",
        "ctrlKey": false,
        "key": "r",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 82
      },
      "prerequisites": [
        {
          "selector": "#search",
          "type": "focus",
          "if": "window.searchFieldHasBeenFocused ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#search",
          "type": "set-text",
          "value": "screwdriver"
        }
      ]
    },
    {
      "description": "Enter \"screwdrivers\" into the search form field",
      "selector": "#search",
      "type": "keyup",
      "event": {
        "code": "KeyS",
        "ctrlKey": false,
        "key": "s",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 83
      },
      "prerequisites": [
        {
          "selector": "#search",
          "type": "focus",
          "if": "window.searchFieldHasBeenFocused ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#search",
          "type": "set-text",
          "value": "screwdrivers"
        }
      ]
    }
  ]
};
