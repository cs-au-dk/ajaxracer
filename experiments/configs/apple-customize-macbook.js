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
      "description": "Click on the \"1.3GHz dual-core i5 processor\" button",
      "selector": "label[for=\"processor__dummy_z0tx_065_c5fl_2\"]",
      "type": "click"
    },
    {
      "description": "Click on the \"1.4GHz dual-core i5 processor\" button",
      "selector": "label[for=\"processor__dummy_z0tx_065_c5fm_3\"]",
      "type": "click"
    },
  ],
  "waitForPromises": false
};
