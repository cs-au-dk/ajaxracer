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
      "description": "Enter the search term \"kess\"",
      "selector": "#search-field",
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
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        },
        {
          "description": "Click on the search field",
          "selector": "#search-field",
          "type": "click",
          "if": "document.querySelector(\".search-active\") === null"
        },
        {
          "selector": "#search-field",
          "type": "set-text",
          "value": "kess"
        }
      ]
    },
    {
      "description": "Enter the search term \"kesso\"",
      "selector": "#search-field",
      "type": "keyup",
      "event": {
        "code": "KeyO",
        "ctrlKey": false,
        "key": "o",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 79
      },
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        },
        {
          "description": "Click on the search field",
          "selector": "#search-field",
          "type": "click",
          "if": "document.querySelector(\".search-active\") === null"
        },
        {
          "selector": "#search-field",
          "type": "set-text",
          "value": "kesso"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "deferIframe",
    "focused.*focusTime.*blurTime",
    "sessionCamRecorder(.|\n)*setTimeout"
  ]
};
