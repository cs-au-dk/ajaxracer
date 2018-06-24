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
      "description": "Sort by \"City\"",
      "selector": ".search-results-sorter li[data-original-index=\"2\"] a",
      "type": "click",
      "prerequisites": [
        {
          "description": "Click on \"Sort by: Price\"",
          "selector": ".search-results-sorter button[data-id=\"search-results-sorttype\"]",
          "type": "click"
        }
      ]
    },
    {
      "description": "Filter by 4+ bedrooms",
      "selector": "input[name*=MinBedrooms][value=\"4\"] + span",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#ddbtn-criteria-beds",
          "type": "click"
        }
      ]
    },
    {
      "description": "Filter by 12+ bedrooms",
      "selector": "input[name*=MinBedrooms][value=\"12\"] + span",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#ddbtn-criteria-beds",
          "type": "click"
        }
      ]
    },
    {
      "description": "Click on \"Map\"",
      "selector": "#search-results-displaytype-map",
      "type": "click"
    }
  ],
  "postprocessing": [
    "(function (x) { x && x.remove(); })(document.querySelector(\".results-refresh-date-disclaimer\"))"
  ],
  "forceLoadingAfterWindowLoad": true,
  "maxTimerDuration": 2000,
  "maxTimerChainLength": 200,
  "waitForPromises": false
};
