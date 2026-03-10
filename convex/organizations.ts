import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listOrgs = query({
    handler: async (ctx) => {
        return await ctx.db.query("organizations").collect();
    },
});

export const createOrg = mutation({
    args: { name: v.string(), status: v.string(), domain: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return await ctx.db.insert("organizations", { ...args, createdAt: Date.now() });
    },
});

export const updateOrg = mutation({
    args: { id: v.id("organizations"), name: v.optional(v.string()), status: v.optional(v.string()), domain: v.optional(v.string()), settings: v.optional(v.any()) },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const deleteOrg = mutation({
    args: { id: v.id("organizations") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const listCategories = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("categories");
        if (args.organizationId) {
            return await q.withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!)).collect();
        }
        return await q.collect();
    },
});

export const createCategory = mutation({
    args: {
        name: v.string(),
        organizationId: v.id("organizations"),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("categories", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const updateCategory = mutation({
    args: {
        id: v.id("categories"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const deleteCategory = mutation({
    args: { id: v.id("categories") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// Departments
export const listDepartments = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("departments");
        if (args.organizationId) {
            return await q.withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId!)).collect();
        }
        const depts = await q.collect();
        // Enrich with organization and department head
        return await Promise.all(depts.map(async (d) => {
            const org = await ctx.db.get(d.organizationId);
            const head = d.departmentHead ? await ctx.db.get(d.departmentHead) : null;
            return { ...d, organization: org, departmentHead: head };
        }));
    },
});

export const createDepartment = mutation({
    args: {
        name: v.string(),
        organization: v.id("organizations"),
        description: v.optional(v.string()),
        departmentHead: v.optional(v.id("users")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { organization, ...rest } = args;
        return await ctx.db.insert("departments", {
            ...rest,
            organizationId: organization,
            isActive: args.isActive ?? true,
        });
    },
});

export const updateDepartment = mutation({
    args: {
        id: v.id("departments"),
        name: v.optional(v.string()),
        organization: v.optional(v.id("organizations")),
        description: v.optional(v.string()),
        departmentHead: v.optional(v.id("users")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, organization, ...rest } = args;
        const updates: any = { ...rest };
        if (organization) updates.organizationId = organization;
        await ctx.db.patch(id, updates);
    },
});

export const deleteDepartment = mutation({
    args: { id: v.id("departments") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
