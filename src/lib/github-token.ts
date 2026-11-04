import { clerkClient } from "@clerk/nextjs/server";

// Returns undefined when the user hasn't connected GitHub through Clerk
export const getGithubToken = async (userId: string) => {
  try {
    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "github");

    return tokens.data[0]?.token;
  } catch {
    return undefined;
  }
};
