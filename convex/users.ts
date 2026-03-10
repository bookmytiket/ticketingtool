import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

export const getMe = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.optional(v.string()),
        role: v.string(),
        status: v.string(),
        organizationId: v.optional(v.id("organizations")),
        departmentId: v.optional(v.id("departments")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        if (existing) throw new Error("User already exists");

        return await ctx.db.insert("users", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const list = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let users;
        if (args.organizationId) {
            users = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
                .collect();
        } else {
            users = await ctx.db.query("users").collect();
        }

        return await Promise.all(users.map(async (user) => {
            const organization = user.organizationId ? await ctx.db.get(user.organizationId) : null;
            const department = user.departmentId ? await ctx.db.get(user.departmentId) : null;
            return {
                ...user,
                organization,
                department,
            };
        }));
    },
});
export const update = mutation({
    args: {
        id: v.id("users"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        password: v.optional(v.string()),
        role: v.optional(v.string()),
        status: v.optional(v.string()),
        organizationId: v.optional(v.id("organizations")),
        departmentId: v.optional(v.id("departments")),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const remove = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
