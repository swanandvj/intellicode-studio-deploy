import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values"
import { defaultHead } from "next/head";

export default defineSchema({
   projects: defineTable({
      name: v.string(),
      updatedAt: v.number(),
      ownerID: v.string(),
      importStatus: v.optional(
         v.union(
            v.literal("importing"),
            v.literal("completed"),
            v.literal("failed"),

         )
      ),
      exportStatus: v.optional(
         v.union(
            v.literal("exporting"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("cancelled"),

         )
      ),
      exportRepoUrl: v.optional(v.string()),

   }).index("by_owner", ["ownerID"]),
})