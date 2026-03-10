import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
        password: v.optional(v.string()), // For demo/local auth
        role: v.string(), // admin, technician, user
        status: v.string(), // active, inactive
        organizationId: v.optional(v.id("organizations")),
        departmentId: v.optional(v.id("departments")),
        mfaEnabled: v.optional(v.boolean()),
        mfaSecret: v.optional(v.string()),
        lastLogin: v.optional(v.number()),
        createdAt: v.optional(v.number()),
    }).index("by_email", ["email"]),

    organizations: defineTable({
        name: v.string(),
        domain: v.optional(v.string()),
        status: v.string(),
        settings: v.optional(v.any()),
        createdAt: v.optional(v.number()),
    }).index("by_name", ["name"]),

    departments: defineTable({
        name: v.string(),
        organizationId: v.id("organizations"),
        description: v.optional(v.string()),
        departmentHead: v.optional(v.id("users")),
        isActive: v.optional(v.boolean()),
    }).index("by_organization", ["organizationId"]),

    tickets: defineTable({
        ticketId: v.string(), // e.g. TICKET-1001
        title: v.string(),
        description: v.string(),
        status: v.string(), // open, in-progress, resolved, closed
        priority: v.string(), // low, medium, high, urgent
        userId: v.id("users"), // creator
        assignedTo: v.optional(v.id("users")), // technician
        organizationId: v.id("organizations"),
        categoryId: v.optional(v.id("categories")),
        departmentId: v.optional(v.id("departments")),
        slaStatus: v.optional(v.string()),
        dueDate: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_organization", ["organizationId"])
        .index("by_user", ["userId"])
        .index("by_status", ["status"]),

    categories: defineTable({
        name: v.string(),
        organizationId: v.id("organizations"),
        description: v.optional(v.string()),
        color: v.optional(v.string()),
        status: v.optional(v.string()),
        createdAt: v.optional(v.number()),
    }).index("by_organization", ["organizationId"]),

    comments: defineTable({
        ticketId: v.id("tickets"),
        userId: v.id("users"),
        content: v.string(),
        isInternal: v.boolean(),
        createdAt: v.number(),
    }).index("by_ticket", ["ticketId"]),

    faq: defineTable({
        question: v.string(),
        answer: v.string(),
        keywords: v.optional(v.array(v.string())),
        category: v.string(),
        organizationId: v.optional(v.id("organizations")),
        departmentId: v.optional(v.id("departments")),
        priority: v.optional(v.number()),
        viewCount: v.optional(v.number()),
        helpfulCount: v.optional(v.number()),
        isPublished: v.boolean(),
        createdAt: v.optional(v.number()),
    }).index("by_organization", ["organizationId"]),

    chatbotSessions: defineTable({
        sessionId: v.string(),
        userId: v.optional(v.id("users")),
        status: v.string(), // active, escalated, resolved, closed
        platform: v.string(), // web, teams, slack
        ticketId: v.optional(v.string()),
        organizationId: v.optional(v.id("organizations")),
        departmentId: v.optional(v.id("departments")),
        assignedTo: v.optional(v.id("users")),
        createdAt: v.number(),
    }).index("by_session_id", ["sessionId"])
        .index("by_user", ["userId"]),

    chatbotMessages: defineTable({
        sessionId: v.string(),
        sender: v.string(), // user, bot, technician
        content: v.string(),
        attachments: v.optional(v.array(v.any())),
        createdAt: v.number(),
    }).index("by_session_id", ["sessionId"]),

    auditLogs: defineTable({
        userId: v.id("users"),
        action: v.string(),
        target: v.string(),
        details: v.any(),
        timestamp: v.number(),
    }).index("by_timestamp", ["timestamp"]),

    roles: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        permissions: v.array(v.string()),
        organizationId: v.id("organizations"),
    }).index("by_organization", ["organizationId"]),

    slaPolicies: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        responseTime: v.number(), // in minutes
        resolutionTime: v.number(), // in minutes
        priority: v.string(),
        organizationId: v.id("organizations"),
    }).index("by_organization", ["organizationId"]),

    domainRules: defineTable({
        domain: v.string(),
        organizationId: v.id("organizations"),
        departmentId: v.optional(v.id("departments")),
        priority: v.number(),
    }).index("by_organization", ["organizationId"]),

    emailTemplates: defineTable({
        name: v.string(),
        subject: v.string(),
        body: v.string(),
        type: v.string(), // ticket_created, ticket_resolved, etc.
        organizationId: v.id("organizations"),
    }).index("by_organization", ["organizationId"]),

    apiKeys: defineTable({
        name: v.string(),
        key: v.string(),
        status: v.string(),
        lastUsed: v.optional(v.number()),
        userId: v.id("users"),
        organizationId: v.id("organizations"),
    }).index("by_organization", ["organizationId"])
        .index("by_key", ["key"]),

    integrations: defineTable({
        type: v.string(), // slack, teams, jira, etc.
        config: v.any(),
        status: v.string(),
        organizationId: v.id("organizations"),
    }).index("by_organization", ["organizationId"]),

    settings: defineTable({
        key: v.string(),
        value: v.any(),
        organizationId: v.optional(v.id("organizations")),
    }).index("by_organization_key", ["organizationId", "key"]),
});
