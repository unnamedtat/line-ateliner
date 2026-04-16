// Skeleton tracing and path finalization helpers.
// Runs one thinning pass.
function thinningPass(mask, w, h, firstStep) {
  const toDelete = [];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      const p2 = mask[(y - 1) * w + x];
      const p3 = mask[(y - 1) * w + x + 1];
      const p4 = mask[y * w + x + 1];
      const p5 = mask[(y + 1) * w + x + 1];
      const p6 = mask[(y + 1) * w + x];
      const p7 = mask[(y + 1) * w + x - 1];
      const p8 = mask[y * w + x - 1];
      const p9 = mask[(y - 1) * w + x - 1];

      const neighborSum = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
      if (neighborSum < 2 || neighborSum > 6) {
        continue;
      }

      const transitions =
        Number(!p2 && p3) +
        Number(!p3 && p4) +
        Number(!p4 && p5) +
        Number(!p5 && p6) +
        Number(!p6 && p7) +
        Number(!p7 && p8) +
        Number(!p8 && p9) +
        Number(!p9 && p2);

      if (transitions !== 1) {
        continue;
      }

      const keepCondition = firstStep
        ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
        : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;

      if (keepCondition) {
        toDelete.push(idx);
      }
    }
  }

  for (const idx of toDelete) {
    mask[idx] = 0;
  }

  return toDelete.length > 0;
}

// Runs one thinning pass asynchronously.
async function thinningPassAsync(mask, w, h, firstStep) {
  const toDelete = [];

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在细化骨架像素...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!mask[idx]) {
        continue;
      }

      const p2 = mask[(y - 1) * w + x];
      const p3 = mask[(y - 1) * w + x + 1];
      const p4 = mask[y * w + x + 1];
      const p5 = mask[(y + 1) * w + x + 1];
      const p6 = mask[(y + 1) * w + x];
      const p7 = mask[(y + 1) * w + x - 1];
      const p8 = mask[y * w + x - 1];
      const p9 = mask[(y - 1) * w + x - 1];

      const neighborSum = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
      if (neighborSum < 2 || neighborSum > 6) {
        continue;
      }

      const transitions =
        Number(!p2 && p3) +
        Number(!p3 && p4) +
        Number(!p4 && p5) +
        Number(!p5 && p6) +
        Number(!p6 && p7) +
        Number(!p7 && p8) +
        Number(!p8 && p9) +
        Number(!p9 && p2);

      if (transitions !== 1) {
        continue;
      }

      const keepCondition = firstStep
        ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
        : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;

      if (keepCondition) {
        toDelete.push(idx);
      }
    }
  }

  for (let i = 0; i < toDelete.length; i += 1) {
    if (i % 12000 === 0) {
      await ensureAnalysisResponsive("正在提交骨架裁剪...");
    }
    mask[toDelete[i]] = 0;
  }

  return toDelete.length > 0;
}

// Builds stroke paths from a skeleton mask.
function buildStrokePaths(skeletonMask, distanceField, w, h) {
  const degrees = new Uint8Array(skeletonMask.length);
  const visitedEdges = new Set();
  const paths = [];

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!skeletonMask[idx]) {
        continue;
      }
      degrees[idx] = getSkeletonNeighbors(idx, skeletonMask, w, h).length;
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (!skeletonMask[idx] || degrees[idx] === 2 || degrees[idx] === 0) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, false);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (!skeletonMask[idx]) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, true);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  return paths;
}

// Builds stroke paths from a skeleton mask asynchronously.
async function buildStrokePathsAsync(skeletonMask, distanceField, w, h) {
  const degrees = new Uint8Array(skeletonMask.length);
  const visitedEdges = new Set();
  const paths = [];

  for (let y = 1; y < h - 1; y += 1) {
    if (y % 24 === 1) {
      await ensureAnalysisResponsive("正在统计骨架连通度...");
    }
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      if (!skeletonMask[idx]) {
        continue;
      }
      degrees[idx] = getSkeletonNeighbors(idx, skeletonMask, w, h).length;
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (idx % 12000 === 0) {
      await ensureAnalysisResponsive("正在追踪开放路径...");
    }
    if (!skeletonMask[idx] || degrees[idx] === 2 || degrees[idx] === 0) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, false);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  for (let idx = 0; idx < skeletonMask.length; idx += 1) {
    if (idx % 12000 === 0) {
      await ensureAnalysisResponsive("正在追踪闭环路径...");
    }
    if (!skeletonMask[idx]) {
      continue;
    }

    const neighbors = getSkeletonNeighbors(idx, skeletonMask, w, h);
    for (const neighbor of neighbors) {
      const key = getEdgeKey(idx, neighbor);
      if (visitedEdges.has(key)) {
        continue;
      }

      const traced = tracePath(idx, neighbor, skeletonMask, degrees, w, h, visitedEdges, true);
      const path = finalizePath(traced, distanceField, w, h);
      if (path) {
        paths.push(path);
      }
    }
  }

  return paths;
}

// Gets skeleton neighbors for a pixel.
function getSkeletonNeighbors(idx, mask, w, h) {
  const x = idx % w;
  const y = floor(idx / w);
  const neighbors = [];

  for (const dir of NEIGHBOR_DIRS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
      continue;
    }

    const nIdx = ny * w + nx;
    if (mask[nIdx]) {
      neighbors.push(nIdx);
    }
  }

  return neighbors;
}

// Builds a stable edge key.
function getEdgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

// Traces a skeleton path.
function tracePath(startIdx, nextIdx, mask, degrees, w, h, visitedEdges, allowLoop) {
  const path = [startIdx];
  let prev = startIdx;
  let current = nextIdx;

  while (true) {
    visitedEdges.add(getEdgeKey(prev, current));
    path.push(current);

    if (allowLoop && current === startIdx) {
      break;
    }

    if (degrees[current] !== 2 && current !== startIdx) {
      break;
    }

    const neighbors = getSkeletonNeighbors(current, mask, w, h).filter((candidate) => candidate !== prev);
    const candidates = neighbors.filter((candidate) => !visitedEdges.has(getEdgeKey(current, candidate)));

    if (!candidates.length) {
      if (allowLoop) {
        const loopCandidate = neighbors.find((candidate) => candidate === startIdx);
        if (loopCandidate !== undefined && !visitedEdges.has(getEdgeKey(current, loopCandidate))) {
          prev = current;
          current = loopCandidate;
          continue;
        }
      }
      break;
    }

    const chosen = chooseNextNeighbor(prev, current, candidates, w);
    prev = current;
    current = chosen;
  }

  return path;
}

// Chooses the next neighbor in a traced path.
function chooseNextNeighbor(prev, current, candidates, w) {
  if (candidates.length === 1) {
    return candidates[0];
  }

  const prevX = prev % w;
  const prevY = floor(prev / w);
  const currentX = current % w;
  const currentY = floor(current / w);
  const dirX = currentX - prevX;
  const dirY = currentY - prevY;

  let bestCandidate = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const nextX = candidate % w;
    const nextY = floor(candidate / w);
    const stepX = nextX - currentX;
    const stepY = nextY - currentY;
    const stepLength = max(0.0001, sqrt(stepX * stepX + stepY * stepY));
    const score = (dirX * stepX + dirY * stepY) / stepLength;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}
