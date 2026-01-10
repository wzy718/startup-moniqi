// 轻量可存档 RNG（避免刷新后随机序列完全漂移，方便复现问题）

export function createRng(seed) {
  let s = (seed >>> 0) || 1;

  function next() {
    // LCG: Numerical Recipes
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }

  function nextInt(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi < lo) return lo;
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  return {
    next,
    nextInt,
    get seed() {
      return s;
    },
    set seed(v) {
      s = (Number(v) >>> 0) || 1;
    },
  };
}

export function seedFromNow() {
  const t = Date.now() >>> 0;
  const r = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return (t ^ r) >>> 0;
}

