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
  "original": "https://jobs.exxonmobil.com/content/All-Job-Locations/?locale=en_US",
  "manualEventSequence": [
    {
      "description": "Search for the term \"Europe\"",
      "selector": "#mapsearch button",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#map-query",
          "type": "set-text",
          "value": "Europe"
        }
      ]
    },
    {
      "description": "Search for the term \"United States\"",
      "selector": "#mapsearch button",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#map-query",
          "type": "set-text",
          "value": "United States"
        }
      ]
    }
  ]
};
