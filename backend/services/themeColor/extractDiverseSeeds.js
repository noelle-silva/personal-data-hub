module.exports = function extractDiverseSeeds({
  scoredColors,
  histogram,
  primaryMinShare,
  minSaturation,
  minHueDistance,
  argbToHsl,
  log = null,
}) {
  const debug = typeof log === 'function' ? log : () => {};
  const seeds = [];

  const candidates = scoredColors.map((argb, idx) => {
    const share = histogram.get(argb) || 0;
    const { h: hue, s: sat, l } = argbToHsl(argb);
    const stability = Math.max(0.5, 1 - idx * 0.05);
    const weight = (1 - idx * 0.1) * share * sat * stability;
    return { argb, hue, sat, l, share, weight, idx };
  });

  candidates.sort((a, b) => b.weight - a.weight);

  for (const candidate of candidates) {
    if (candidate.share < primaryMinShare || candidate.sat < minSaturation) {
      debug(`跳过低权重候选: share=${candidate.share.toFixed(3)} sat=${candidate.sat.toFixed(3)} hue=${candidate.hue.toFixed(1)}`);
      continue;
    }

    const isDiverse = seeds.every((seed) => {
      const hueDistance = Math.abs(candidate.hue - seed.hue);
      const minDist = Math.min(hueDistance, 360 - hueDistance);
      return minDist >= minHueDistance;
    });

    if (isDiverse || seeds.length < 3) {
      seeds.push({
        argb: candidate.argb,
        score: candidate.weight,
        hue: candidate.hue,
        sat: candidate.sat,
        l: candidate.l,
        share: candidate.share,
      });
      debug(`种子${seeds.length}: hue=${candidate.hue.toFixed(1)} sat=${candidate.sat.toFixed(3)} share=${candidate.share.toFixed(3)} weight=${candidate.weight.toFixed(4)}`);
    }

    if (seeds.length >= 5) break;
  }

  while (seeds.length < 3 && candidates.length > seeds.length) {
    let bestCandidate = null;
    let bestDist = Infinity;

    for (const cand of candidates) {
      if (seeds.some((s) => s.argb === cand.argb)) continue;
      const minDistToSeeds = Math.min(...seeds.map((s) => {
        const d = Math.abs(cand.hue - s.hue);
        return Math.min(d, 360 - d);
      }));
      if (minDistToSeeds < bestDist && minDistToSeeds >= minHueDistance) {
        bestDist = minDistToSeeds;
        bestCandidate = cand;
      }
    }

    if (!bestCandidate) break;
    seeds.push({
      argb: bestCandidate.argb,
      score: bestCandidate.weight,
      hue: bestCandidate.hue,
      sat: bestCandidate.sat,
      l: bestCandidate.l,
      share: bestCandidate.share,
    });
    debug(`补足种子${seeds.length}: hue=${bestCandidate.hue.toFixed(1)} sat=${bestCandidate.sat.toFixed(3)} share=${bestCandidate.share.toFixed(3)}`);
  }

  return seeds.slice(0, 5);
};

