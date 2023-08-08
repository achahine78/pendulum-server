const getDistance = (a, b) => {
  const x = b.x - a.x;
  const y = b.y - a.y;

  return Math.sqrt(x * x + y * y);
};

module.exports = getDistance;
