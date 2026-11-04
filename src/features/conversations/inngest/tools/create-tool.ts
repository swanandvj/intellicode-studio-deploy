import { z } from "zod";

// Tools receive a step runner so each one can wrap its work. The agent loop
// already runs every tool inside its own Inngest step, so this just calls it.
export interface ToolContext {
  step: {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
  };
}

export const createTool = <TSchema extends z.ZodType>(tool: {
  name: string;
  description: string;
  parameters: TSchema;
  handler: (
    params: z.infer<TSchema>,
    context: ToolContext
  ) => Promise<string | undefined>;
}) => tool;
