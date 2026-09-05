export declare const v1BatchCreateSchema: {
  safeParse(input: unknown):
    | {
        success: true;
        data: {
          input_file_id: string;
          endpoint: string;
          completion_window: "24h";
          metadata?: Record<string, string>;
          output_expires_after?: { anchor: "created_at"; seconds: number };
        };
      }
    | { success: false; error: { message: string } };
};
