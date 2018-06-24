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
      "description": "Click on the \"Support Articles\" button",
      "selector": ".SearchResults .SUPPORT_ARTICLES",
      "type": "click",
      "prerequisites": [
        {
          "description": "Show the filtering options",
          "selector": "button.SearchFilterToggle",
          "type": "click",
          "if": "document.querySelector(\"#searchFilterPanel\").hasClassName(\"is-expanded\") === false"
        }
      ]
    },
    {
      "description": "Click on the \"Communities\" button",
      "selector": ".SearchResults .DISCUSSIONS",
      "type": "click",
      "prerequisites": [
        {
          "description": "Show the filtering options",
          "selector": "button.SearchFilterToggle",
          "type": "click",
          "if": "document.querySelector(\"#searchFilterPanel\").hasClassName(\"is-expanded\") === false"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "PPVevent"
  ],
  "waitForPromises": false
};
