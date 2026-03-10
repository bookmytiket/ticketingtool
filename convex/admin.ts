import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// SSO Config
export const getSSOConfig = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("settings")
            .withIndex("by_organization_key", (q) => q.eq("organizationId", undefined).eq("key", "sso_config"))
            .unique();
    },
});

export const setSSOConfig = mutation({
    args: { value: v.any() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("settings")
            .withIndex("by_organization_key", (q) => q.eq("organizationId", undefined).eq("key", "sso_config"))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value });
        } else {
            await ctx.db.insert("settings", { key: "sso_config", value: args.value });
        }
    },
});

// Email Settings
export const getEmailSettings = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("settings")
            .withIndex("by_organization_key", (q) => q.eq("organizationId", undefined).eq("key", "email_settings"))
            .unique();
    },
});

export const setEmailSettings = mutation({
    args: { value: v.any() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("settings")
            .withIndex("by_organization_key", (q) => q.eq("organizationId", undefined).eq("key", "email_settings"))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value });
        } else {
            await ctx.db.insert("settings", { key: "email_settings", value: args.value });
        }
    },
});

// Logo Settings
export const getLogo = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("settings")
            .withIndex("by_organization_key", (q) => q.eq("organizationId", undefined).eq("key", "logo_settings"))
            .unique();
    },
});

export const setLogo = mutation({
    args: { value: v.any() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("settings")
            .withIndex("by_organization_key", (q) => q.eq("organizationId", undefined).eq("key", "logo_settings"))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, { value: args.value });
        } else {
            await ctx.db.insert("settings", { key: "logo_settings", value: args.value });
        }
    },
});

// SLA Policies
export const listSLA = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        if (args.organizationId) {
            return await ctx.db
                .query("slaPolicies")
                .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!))
                .collect();
        }
        return await ctx.db.query("slaPolicies").collect();
    },
});

export const createSLA = mutation({
    args: {
        name: v.string(),
        responseTime: v.number(),
        resolutionTime: v.number(),
        priority: v.string(),
        organizationId: v.id("organizations"),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("slaPolicies", args);
    },
});

export const updateSLA = mutation({
    args: {
        id: v.id("slaPolicies"),
        name: v.optional(v.string()),
        responseTime: v.optional(v.number()),
        resolutionTime: v.optional(v.number()),
        priority: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const deleteSLA = mutation({
    args: { id: v.id("slaPolicies") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// Domain Rules
export const listDomainRules = query({
    handler: async (ctx) => {
        return await ctx.db.query("domainRules").collect();
    },
});

export const createDomainRule = mutation({
    args: {
        domain: v.string(),
        organizationId: v.id("organizations"),
        departmentId: v.optional(v.id("departments")),
        priority: v.number()
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("domainRules", args);
    },
});
