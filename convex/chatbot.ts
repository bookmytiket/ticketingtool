import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
    args: { platform: v.string() },
    handler: async (ctx, args) => {
        const sessionId = "sess_" + Math.random().toString(36).substring(2, 10);
        const id = await ctx.db.insert("chatbotSessions", {
            sessionId,
            status: "active",
            platform: args.platform,
            createdAt: Date.now(),
        });
        return { sessionId, id };
    },
});

export const sendMessage = mutation({
    args: {
        sessionId: v.string(),
        content: v.string(),
        sender: v.string(), // user, bot, technician
        attachments: v.optional(v.array(v.any())),
    },
    handler: async (ctx, args) => {
        const { sessionId, content, sender, attachments } = args;
        await ctx.db.insert("chatbotMessages", {
            sessionId,
            sender,
            content,
            attachments,
            createdAt: Date.now(),
        });

        // Update session last updated if needed? 
        // For now just insert message.
    },
});

export const getHistory = query({
    args: { userId: v.optional(v.id("users")), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        // This is a simplified version. Usually you'd join with users.
        const sessions = await ctx.db.query("chatbotSessions").order("desc").take(args.limit || 50);

        // Enrich sessions with user data and messages if possible, or leave it to frontend to fetch message history separately
        const enrichedSessions = await Promise.all(sessions.map(async (s) => {
            const user = s.userId ? await ctx.db.get(s.userId) : null;
            const lastMessage = await ctx.db.query("chatbotMessages")
                .withIndex("by_session_id", (q) => q.eq("sessionId", s.sessionId))
                .order("desc")
                .first();
            return {
                ...s,
                user,
                lastMessage,
            };
        }));

        return enrichedSessions;
    },
});

export const getSession = query({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        const session = await ctx.db.query("chatbotSessions")
            .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
            .unique();

        if (!session) return null;

        const messages = await ctx.db.query("chatbotMessages")
            .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
            .order("asc")
            .collect();

        const user = session.userId ? await ctx.db.get(session.userId) : null;
        const assignedTo = session.assignedTo ? await ctx.db.get(session.assignedTo) : null;

        return {
            session: {
                ...session,
                user,
                assignedTo,
            },
            messages,
        };
    },
});

export const escalate = mutation({
    args: {
        sessionId: v.string(),
        departmentId: v.optional(v.id("departments")),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.query("chatbotSessions")
            .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
            .unique();

        if (!session) throw new Error("Session not found");

        await ctx.db.patch(session._id, {
            status: "escalated",
            departmentId: args.departmentId,
        });
    },
});
