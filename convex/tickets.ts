import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let q = ctx.db.query("tickets");
        if (args.organizationId) {
            q = q.withIndex("by_organization", (query) => query.eq("organizationId", args.organizationId!));
        }
        const tickets = await q.collect();
        if (args.status) {
            return tickets.filter(t => t.status === args.status);
        }
        return tickets;
    },
});

export const getById = query({
    args: { id: v.id("tickets") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getByTicketId = query({
    args: { ticketId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tickets")
            .filter((q) => q.eq(q.field("ticketId"), args.ticketId))
            .first();
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        priority: v.string(),
        userId: v.id("users"),
        organizationId: v.id("organizations"),
        categoryId: v.optional(v.id("categories")),
        departmentId: v.optional(v.id("departments")),
    },
    handler: async (ctx, args) => {
        const ticketCount = (await ctx.db.query("tickets").collect()).length;
        const ticketId = `TICKET-${1000 + ticketCount + 1}`;

        return await ctx.db.insert("tickets", {
            ...args,
            ticketId,
            status: "open",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("tickets"),
        status: v.optional(v.string()),
        priority: v.optional(v.string()),
        assignedTo: v.optional(v.id("users")),
        dueDate: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },
});

export const addComment = mutation({
    args: {
        ticketId: v.id("tickets"),
        userId: v.id("users"),
        content: v.string(),
        isInternal: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("comments", {
            ...args,
            createdAt: Date.now(),
        });
        return await ctx.db.get(args.ticketId);
    },
});

export const getStats = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        let q = ctx.db.query("tickets");
        if (args.organizationId) {
            q = q.withIndex("by_organization", (query) => query.eq("organizationId", args.organizationId!));
        }
        const tickets = await q.collect();

        return {
            totalTickets: tickets.length,
            openTickets: tickets.filter(t => t.status === "open").length,
            approvalPendingTickets: tickets.filter(t => t.status === "approval-pending").length,
            approvedTickets: tickets.filter(t => t.status === "approved").length,
            rejectedTickets: tickets.filter(t => t.status === "rejected").length,
            inProgressTickets: tickets.filter(t => t.status === "in-progress").length,
            resolvedTickets: tickets.filter(t => t.status === "resolved").length,
            closedTickets: tickets.filter(t => t.status === "closed").length,
            pendingTickets: tickets.filter(t => t.status === "open" || t.status === "in-progress").length,
            overdueTickets: tickets.filter(t => {
                if (!t.dueDate) return false;
                return (t.status === "open" || t.status === "in-progress") && new Date(t.dueDate) < new Date();
            }).length,
            recentTickets: tickets.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
        };
    },
});
