import { z } from "zod";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { getAiModel } from "@/lib/ai";
import { parseBody } from "@/lib/api-route";
import { firecrawl } from "@/lib/firecrawl";

// The editor gives up after 30 seconds, so stop just before it does
const QUICK_EDIT_TIMEOUT_MS = 28_000;

const requestSchema = z.object({
  selectedCode: z.string().min(1, "Selected code is required"),
  fullCode: z.string().optional(),
  instruction: z.string().min(1, "Instruction is required"),
});

const quickEditSchema = z.object({
  editedCode: z
    .string()
    .describe(
      "The edited version of the selected code based on the instruction"
    ),
});

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

{documentation}

<instruction>
{instruction}
</instruction>

<instructions>
Return ONLY the edited version of the selected code.
Maintain the same indentation level as the original.
Do not include any explanations or comments unless requested.
If the instruction is unclear or cannot be applied, return the original code unchanged.
</instructions>`;

export async function POST(request: Request) {
  const timeout = AbortSignal.timeout(QUICK_EDIT_TIMEOUT_MS);

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const parsed = await parseBody(request, requestSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { selectedCode, fullCode, instruction } = parsed.data;

    const urls: string[] = instruction.match(URL_REGEX) || [];
    let documentationContext = "";

    if (urls.length > 0) {
      const scrapedResults = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            if (result.markdown) {
              return `<doc url="${url}">\n${result.markdown}\n</doc>`;
            }

            return null;
          } catch {
            return null;
          }
        })
      );

      const validResults = scrapedResults.filter(Boolean);

      if (validResults.length > 0) {
        documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
      }
    }

    const prompt = QUICK_EDIT_PROMPT
      .replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode || "")
      .replace("{instruction}", instruction)
      .replace("{documentation}", documentationContext);

    const { output } = await generateText({
      model: getAiModel(),
      output: Output.object({ schema: quickEditSchema }),
      prompt,
      maxRetries: 1,
      abortSignal: AbortSignal.any([request.signal, timeout]),
    });

    return NextResponse.json({ editedCode: output.editedCode });
  } catch (error) {
    if (timeout.aborted) {
      return NextResponse.json(
        { error: "The AI model took too long to respond" },
        { status: 504 }
      );
    }

    console.error("Edit error:", error);
    return NextResponse.json(
      { error: "Failed to generate edit" },
      { status: 500 }
    );
  }
};