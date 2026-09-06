export const MAX_EMBEDDING_INLINE_ITEM_BYTES: number;
export const MAX_EMBEDDING_INLINE_TOTAL_BYTES: number;

export type EmbeddingMultimodalItem =
  | { type: "text"; text: string }
  | {
      type: "image" | "audio" | "video" | "document";
      source:
        | { type: "url"; url: string }
        | { type: "base64"; data: string; media_type: string };
    };
