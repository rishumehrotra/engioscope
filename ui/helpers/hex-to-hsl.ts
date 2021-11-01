export default (hex: string) => {
  const r = parseInt(hex.substr(1, 2), 16) / 255;
  const g = parseInt(hex.substr(3, 2), 16) / 255;
  const b = parseInt(hex.substr(5, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  // eslint-disable-next-line no-nested-ternary
  const s = max === min
    ? 0
    : l < 0.5
      ? (max - min) / (max + min)
      : (max - min) / (2 - max - min);

  // eslint-disable-next-line no-nested-ternary
  const h = max === min
    ? 0
    // eslint-disable-next-line no-nested-ternary
    : r === max
      ? (g - b) / (max - min)
      : g === max
        ? 2 + (b - r) / (max - min)
        : 4 + (r - g) / (max - min);

  return [h * 60, s * 100, l * 100] as const;
};
