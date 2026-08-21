
import { mutation, query } from "./_generated/server";

import { v } from "convex/values"

export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return []

        }
        await ctx.db.insert("projects",
            { name: args.name, ownerID: identity?.subject }
        )
    }
})

export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized !");

        }
        return await ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerID", identity.subject))
            .collect()
    }
})