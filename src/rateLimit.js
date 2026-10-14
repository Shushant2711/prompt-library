// Allows max 20 runs per minute per visitor (IP)
const hits = new Map();

module.exports = function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
};
