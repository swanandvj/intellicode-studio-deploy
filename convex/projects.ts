import { mutation, query } from "./_generated/server";
import { v } from "convex/values"
import { verifyAuth } from "./Auth";

export const updateSettings = mutation({
    args: {
        id: v.id("projects"),
        settings: v.object({
            installCommand: v.optional(v.string()),
            devCommand: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await verifyAuth(ctx)
        if (!identity) {
            throw new Error("Not authenticated")
        }

        const project = await ctx.db.get(args.id)
        if (!project) {
            throw new Error("project not found")
        }
        if (project.ownerID !== identity.subject) {
            throw new Error("Unauthorized access to this project")
        }

        await ctx.db.patch(args.id, {
            settings: args.settings,
            updatedAt: Date.now(),
        })
    }
})

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
                name: args.name,
                ownerID: identity.subject,
                updatedAt: Date.now(),
            }
        )
        return projectID;
    }
})

export const getpartial = query({
    args: {
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await verifyAuth(ctx)
        if (!identity) {
            return []
        }

        return await ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerID", identity.subject))
            .order("desc")
            .take(args.limit)
    }
})

export const get = query({
    args: {},
    handler: async (ctx, args) => {
        const identity = await verifyAuth(ctx)
        if (!identity) {
            return []
        }

        return await ctx.db
            .query("projects")
            .withIndex("by_owner", (q) => q.eq("ownerID", identity.subject))
            .order("desc")
            .collect()
    }
})

export const getById = query({
    args: {
        id: v.id("projects")
    },
    handler: async (ctx, args) => {
        const identity = await verifyAuth(ctx)
        if (!identity) {
            throw new Error("Not authenticated")
        }

        const project = await ctx.db.get(args.id)
        if (!project) {
            throw new Error("project not found")
        }
        if (project.ownerID !== identity.subject) {
            throw new Error("Unauthorized access to this project")
        }

        return project;
    }
})

export const rename = mutation({
    args: {
        id: v.id("projects"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await verifyAuth(ctx)
        if (!identity) {
            throw new Error("Not authenticated")
        }

        const project = await ctx.db.get(args.id)

        if (!project) {
            throw new Error("project not found")
        }

        if (project.ownerID !== identity.subject) {
            throw new Error("Unauthorized access to this project")
        }

        await ctx.db.patch(args.id, {
            name: args.name,
            updatedAt: Date.now()
        })
    }
})