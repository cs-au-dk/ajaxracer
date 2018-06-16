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
