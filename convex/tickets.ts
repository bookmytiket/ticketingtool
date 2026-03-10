import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function hydrateTicket(ctx: any, ticket: any) {
    if (!ticket) return null;
    const [creator, assignee, approvedBy, category, department, organization] = await Promise.all([
        ctx.db.get(ticket.userId),
        ticket.assignedTo ? ctx.db.get(ticket.assignedTo) : Promise.resolve(null),
        ticket.approvedBy ? ctx.db.get(ticket.approvedBy) : Promise.resolve(null),
        ticket.categoryId ? ctx.db.get(ticket.categoryId) : Promise.resolve(null),
        ticket.departmentId ? ctx.db.get(ticket.departmentId) : Promise.resolve(null),
        ctx.db.get(ticket.organizationId),
    ]);

    return {
        ...ticket,
        creator,
        assignee,
        approvedBy: approvedBy, // Keep as object for frontend
        // Map category object for details, but keep category name for list view compatibility if needed
        category: category ? category.name : (typeof ticket.category === 'string' ? ticket.category : null),
        categoryDetails: category,
        department,
        organization,
    };
}

export const list = query({
    args: {
        organizationId: v.optional(v.id("organizations")),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const tickets = args.organizationId
            ? await ctx.db.query("tickets").withIndex("by_organization", (query) => query.eq("organizationId", args.organizationId!)).collect()
            : await ctx.db.query("tickets").collect();

        const filteredTickets = args.status
            ? tickets.filter(t => t.status === args.status)
            : tickets;

        return await Promise.all(filteredTickets.map(t => hydrateTicket(ctx, t)));
    },
});

export const getById = query({
    args: { id: v.id("tickets") },
    handler: async (ctx, args) => {
        const ticket = await ctx.db.get(args.id);
        return await hydrateTicket(ctx, ticket);
    },
});

export const getByTicketId = query({
    args: { ticketId: v.string() },
    handler: async (ctx, args) => {
        const ticket = await ctx.db
            .query("tickets")
            .filter((q) => q.eq(q.field("ticketId"), args.ticketId))
            .first();
        return await hydrateTicket(ctx, ticket);
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

        const id = await ctx.db.insert("tickets", {
            ...args,
            ticketId,
            status: "open",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        const ticket = await ctx.db.get(id);
        return await hydrateTicket(ctx, ticket);
    },
});

export const update = mutation({
    args: {
        id: v.id("tickets"),
        status: v.optional(v.string()),
        priority: v.optional(v.string()),
        assignedTo: v.optional(v.union(v.id("users"), v.null())),
        approvedBy: v.optional(v.id("users")),
        dueDate: v.optional(v.union(v.string(), v.null())),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });

        const ticket = await ctx.db.get(id);
        return await hydrateTicket(ctx, ticket);
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
        const ticket = await ctx.db.get(args.ticketId);
        return await hydrateTicket(ctx, ticket);
    },
});

export const getStats = query({
    args: { organizationId: v.optional(v.id("organizations")) },
    handler: async (ctx, args) => {
        const tickets = args.organizationId
            ? await ctx.db.query("tickets").withIndex("by_organization", (query) => query.eq("organizationId", args.organizationId!)).collect()
            : await ctx.db.query("tickets").collect();

        const hydratedRecent = await Promise.all(
            tickets
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5)
                .map(t => hydrateTicket(ctx, t))
        );

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
            recentTickets: hydratedRecent,
        };
    },
});
