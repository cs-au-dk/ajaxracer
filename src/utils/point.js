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

function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.isAboveEq = function (other) {
  return this.y <= other.y;
};

Point.prototype.isBelowEq = function (other) {
  return this.y >= other.y;
};

Point.prototype.isLeftOfEq = function (other) {
  return this.x <= other.x;
};

Point.prototype.isRightOfEq = function (other) {
  return this.x >= other.x;
};

Point.getPointsFromArea = function (area) {
  return [
    /*upperLeft=*/new Point(area.x, area.y),
    /*lowerRight=*/new Point(area.x + area.width, area.y + area.height)
  ];
};

module.exports = Point;
