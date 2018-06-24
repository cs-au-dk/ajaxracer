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
      "description": "Click on the \"Enter Location or ZIP code\" form field",
      "selector": "#search", "type": "click"
    },
    {
      "description": "Click on the \"Enter Origin\" form field",
      "selector": "#startLocation", "type": "click"
    },
    {
      "description": "Click on the \"Enter Destination\" form field",
      "selector": "#endLocation", "type": "click"
    },
    {
      "description": "Click on the \"ExtraMile Station\" button",
      "selector": "#collapseFilter a:nth-child(1)", "type": "click"
    },
    {
      "description": "Click on the \"Car Wash Locations\" button",
      "selector": "#collapseFilter a:nth-child(2)", "type": "click"
    },
    {
      "description": "Click on the \"Clear filters\" link",
      "selector": "#clearFilters a:nth-child(1)", "type": "click"
    },
    {
      "description": "Click on the \"Traffic\" link",
      "selector": "#trafficBtn", "type": "click"
    },
    {
      "description": "Search for \"San Francisco\"",
      "selector": ".search-button input", "type": "click",
      "prerequisites": [
        {
          "selector": "#search", "type": "set-text", "value": "San Francisco"
        }
      ]
    },
    {
      "description": "Search for \"Sunnyvale\"",
      "selector": ".search-button input", "type": "click",
      "prerequisites": [
        {
          "selector": "#search", "type": "set-text", "value": "Sunnyvale"
        }
      ]
    }
  ]
};
