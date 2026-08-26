
import { mutation, query } from "./_generated/server";

import { v } from "convex/values"
import { verifyAuth } from "./Auth";

export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await verifyAuth(ctx)
        if (!identity) {
            return []

        }
       const projectID = await ctx.db.insert("projects",
        {
            name:args.name,
            ownerID:identity.subject,
            updatedAt:Date.now(),
           
        }
       )
       return projectID;
    }
})

export const getpartial = query({
    args: {
        limit:v.number(),
    },
    handler: async (ctx,args) => {
        const identity = await verifyAuth(ctx)

        
       return await ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerID", identity.subject))
             .order("desc")
            .take(args.limit)
           
    }
})

export const get = query({
    args: {},
    handler: async (ctx,args) => {
        const identity = await verifyAuth(ctx)

        
       return ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerID", identity.subject))
            .order("desc")
            .collect()
    }
})