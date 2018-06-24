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
      "description": "Use the \"Verizon company stores\" filter",
      "selector": "a.apply-filter",
      "type": "click",
      "prerequisites": [
        {
          "selector": "a.btnFilter",
          "type": "click"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(1) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Verizon_company_stores]\").checked === false"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(2) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Authorized_Retailer]\").checked === true"
        }
      ]
    },
    {
      "description": "Use the \"Authorized Retailer\" filter",
      "selector": "a.apply-filter",
      "type": "click",
      "prerequisites": [
        {
          "selector": "a.btnFilter",
          "type": "click"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(2) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Authorized_Retailer]\").checked === false"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(1) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Verizon_company_stores]\").checked === true"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "a\\.j\\.n\\.gb\\.La",
    "for \\(key in listeners\\)",
    "idleSecondsCounter",
    "PPVevent"
  ],
  "maxTimerDuration": 2000,
  "maxTimerChainLength": 10
};
