import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("faq").collect();
    },
});

export const getById = query({
    args: { id: v.id("faq") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const create = mutation({
    args: {
        question: v.string(),
        answer: v.string(),
        keywords: v.optional(v.array(v.string())),
        category: v.string(),
        organization: v.optional(v.id("organizations")),
        department: v.optional(v.id("departments")),
        priority: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { organization, department, isPublished, ...rest } = args;
        return await ctx.db.insert("faq", {
            ...rest,
            organizationId: organization,
            departmentId: department,
            isPublished: isPublished ?? true,
            viewCount: 0,
            helpfulCount: 0,
            createdAt: Date.now(),
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("faq"),
        question: v.optional(v.string()),
        answer: v.optional(v.string()),
        keywords: v.optional(v.array(v.string())),
        category: v.optional(v.string()),
        organization: v.optional(v.id("organizations")),
        department: v.optional(v.id("departments")),
        priority: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, organization, department, ...rest } = args;
        const updates: any = { ...rest };
        if (organization !== undefined) updates.organizationId = organization;
        if (department !== undefined) updates.departmentId = department;
        await ctx.db.patch(id, updates);
    },
});

export const remove = mutation({
    args: { id: v.id("faq") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const markHelpful = mutation({
    args: { id: v.id("faq") },
    handler: async (ctx, args) => {
        const faq = await ctx.db.get(args.id);
        if (faq) {
            await ctx.db.patch(args.id, {
                helpfulCount: (faq.helpfulCount || 0) + 1,
            });
        }
    },
});

export const incrementView = mutation({
    args: { id: v.id("faq") },
    handler: async (ctx, args) => {
        const faq = await ctx.db.get(args.id);
        if (faq) {
            await ctx.db.patch(args.id, {
                viewCount: (faq.viewCount || 0) + 1,
            });
        }
    },
});
