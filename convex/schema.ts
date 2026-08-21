import { defineSchema,defineTable } from "convex/server";
import {v} from "convex/values"
import { defaultHead } from "next/head";

export default defineSchema({
     projects:defineTable({
        name:v.string(),
        ownerID:v.string(),
        importStatus:v.optional(
           v.union(
            v.literal("importing"),
            v.literal("completed"),
            v.literal("failed"),

           )
        )
     }).index("by_owner",["ownerID"]),
})