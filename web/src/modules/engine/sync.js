// 用于把“flags（表驱动）”与“结构化状态（便于 UI/系统）”保持一致。
// 约定：核心口径仍以 flags 为准（events/choices 主要通过 flags 做条件）。

export function syncStateAfterEffects(state) {
  syncRelationship(state);
  syncChildren(state);
}

function syncRelationship(state) {
  const statuses = ["married", "dating", "divorced", "single"];
  const flags = state.flags || {};
  const found = statuses.find((s) => flags[s]);

  if (found) {
    state.player.relationshipStatus = found;
    statuses.forEach((s) => {
      if (s !== found) delete flags[s];
    });
    return;
  }

  const prev = String(state.player.relationshipStatus || "single");
  const safe = statuses.includes(prev) ? prev : "single";
  state.player.relationshipStatus = safe;
  flags[safe] = true;
}

function syncChildren(state) {
  const flags = state.flags || {};
  const has = Boolean(flags.has_children) || Number(state.player.childrenCount || 0) > 0;
  state.player.hasChildren = has;
  if (has) flags.has_children = true;
}

