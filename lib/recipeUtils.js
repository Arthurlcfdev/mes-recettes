export function adjustQty(qty, base, current) {
  if (!qty || isNaN(parseFloat(qty))) return qty || "";
  const num = parseFloat(qty);
  const adjusted = num * (current / base);
  if (adjusted % 1 === 0) return String(Math.round(adjusted));
  return parseFloat(adjusted < 1 ? adjusted.toFixed(2) : adjusted.toFixed(1)).toString();
}

export function colorFromName(name) {
  const hues = [16, 40, 160, 200, 260, 300];
  return `hsl(${hues[name.charCodeAt(0) % hues.length]}, 55%, 62%)`;
}

export function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
