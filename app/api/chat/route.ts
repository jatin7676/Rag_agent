import { convertToModelMessages, streamText, tool, UIMessage,stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createResource } from '@/lib/actions/resources';
import { findRelevantContent } from '@/lib/ai/embedding';


// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: `You are a helpful assistant. The current date and time is ${new Date().toString()}.

    When the user asks a question, first call the getInformation tool to check your knowledge base.
    - If the knowledge base returns relevant information, answer using that information.
    - If the knowledge base has nothing relevant, answer using your own general knowledge instead. Do NOT refuse just because the knowledge base is empty.
    - For questions about the current date, time, or recent/real-time events, use the date provided above. If you genuinely cannot know something (e.g. live data you have no access to), say so honestly.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),

    tools: {
        addResource: tool({
          description: `add a resource to your knowledge base.
            If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
          inputSchema: z.object({
            content: z
              .string()
              .describe('the content or resource to add to the knowledge base'),
          }),
          execute: async ({ content }) => createResource({ content }),
        }),
        getInformation: tool({
          description: `get information from your knowledge base.
            If the user asks a question, use this tool to get information from the knowledge base.`,
          inputSchema: z.object({
            query: z.string().describe('the question to get information from the knowledge base'),
          }),
          execute: async ({ query }) => findRelevantContent(query),
        }),
      },
    
  });

  return result.toUIMessageStreamResponse();
}
