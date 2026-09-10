/** Map arbitrary upstream tool-call indices to contiguous first-seen indices. */
export type ToolCallLocalIndexState = {
  toolCallLocalIndex?: Record<string, number>;
  toolCallLocalIndexNext?: number;
};

export function resolveLocalToolCallIndex(
  state: ToolCallLocalIndexState,
  tcIdx: string | number
): number {
  if (!state.toolCallLocalIndex) state.toolCallLocalIndex = {};
  if (state.toolCallLocalIndex[tcIdx] === undefined) {
    state.toolCallLocalIndex[tcIdx] = state.toolCallLocalIndexNext ?? 0;
    state.toolCallLocalIndexNext = state.toolCallLocalIndex[tcIdx] + 1;
  }
  return state.toolCallLocalIndex[tcIdx];
}
