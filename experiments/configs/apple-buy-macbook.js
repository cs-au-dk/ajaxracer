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
      "description": "Search for delivery options to \"94040\"",
      "selector": "button[data-autom=\"viewOptionsButton\"]",
      "type": "click",
      "prerequisites": [
        {
          "description": "Click on the \"Delivery options\" link",
          "selector": "div.as-macbundle:first-child .as-macbtr-options:first-child .shipdeliverydates button[data-autom=\"deliveryDateChecker\"]",
          "type": "click",
          "if": "window.deliveryOptionsOpened ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#postalCode",
          "type": "set-text",
          "value": "94040"
        }
      ]
    },
    {
      "description": "Search for delivery options to \"02115\"",
      "selector": "button[data-autom=\"viewOptionsButton\"]",
      "type": "click",
      "prerequisites": [
        {
          "description": "Click on the \"Delivery options\" link",
          "selector": "div.as-macbundle:first-child .as-macbtr-options:first-child .shipdeliverydates button[data-autom=\"deliveryDateChecker\"]",
          "type": "click",
          "if": "window.deliveryOptionsOpened ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#postalCode",
          "type": "set-text",
          "value": "02115"
        }
      ]
    },
  ],
  "waitForPromises": false
};
