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
      "description": "Filter by year 2017",
      "selector": "#press-year",
      "type": "change",
      "prerequisites": [
        {
          "selector": "#press-year",
          "type": "set-index",
          "value": 1
        }
      ]
    },
    {
      "description": "Filter by year 2016",
      "selector": "#press-year",
      "type": "change",
      "prerequisites": [
        {
          "selector": "#press-year",
          "type": "set-index",
          "value": 2
        }
      ]
    }
  ]
};
