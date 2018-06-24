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
      "description": "Filter by \"June 2018\"",
      "selector": "li[id*=Jun2018]",
      "type": "mouseup",
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        },
        {
          "selector": "span[aria-labelledby*=FilterByMonth]",
          "type": "mousedown"
        }
      ]
    },
    {
      "description": "Filter by \"Chronic Care Management\"",
      "selector": "ul#select2-ddlFilterTopic-results li:nth-child(2)",
      "type": "mouseup",
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        },
        {
          "selector": "span[aria-labelledby*=FilterTopic]",
          "type": "mousedown"
        }
      ]
    },
    {
      "description": "Click on the \"RESET\" button",
      "selector": ".reset",
      "type": "click",
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        }
      ]
    },
    {
      "description": "Click on the \"Next\" button",
      "selector": "li.next a",
      "type": "click",
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "deferIframe",
    "focused.*focusTime.*blurTime",
    "sessionCamRecorder(.|\n)*setTimeout"
  ],
  "maxTimerChainLength": 100
};
