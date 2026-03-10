import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
};

const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
};

const corsResponse = () => new Response(null, { status: 204, headers: corsHeaders });

// Centralized OPTIONS handler for ALL routes
http.route({
    pathPrefix: "/",
    method: "OPTIONS",
    handler: httpAction(async () => corsResponse()),
});

// Helper for ID extraction
const getPathId = (url: string) => {
    try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        const id = parts[parts.length - 1];
        console.log(`Extracting ID from URL: ${url} -> ${id}`);
        return id;
    } catch (e) {
        console.error("Failed to parse URL for ID:", url);
        return null;
    }
};

// Auth
http.route({
    path: "/auth/login",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const { email, password } = await request.json();
            const user = await ctx.runQuery(api.users.getByEmail, { email });
            if (!user || user.password !== password) {
                return jsonResponse({ message: "Invalid credentials" }, 401);
            }
            return jsonResponse({ user, token: "demo-token-" + user.role, mfaRequired: false });
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    path: "/auth/me",
    method: "GET",
    handler: httpAction(async (ctx) => {
        const users = await ctx.runQuery(api.users.list, {});
        return jsonResponse(users[0] || {});
    }),
});

// Organizations
http.route({
    path: "/organizations",
    method: "GET",
    handler: httpAction(async (ctx) => {
        try {
            const orgs = await ctx.runQuery(api.organizations.listOrgs);
            return jsonResponse(orgs);
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    path: "/organizations",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const data = await request.json();
            const id = await ctx.runMutation(api.organizations.createOrg, {
                name: data.name,
                status: data.status,
                domain: data.domain,
            });
            return jsonResponse({ id });
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    pathPrefix: "/organizations/",
    method: "PUT",
    handler: httpAction(async (ctx, request) => {
        const id = getPathId(request.url) as any;
        const data = await request.json();
        await ctx.runMutation(api.organizations.updateOrg, { id, ...data });
        return jsonResponse({ success: true });
    }),
});

http.route({
    pathPrefix: "/organizations/",
    method: "DELETE",
    handler: httpAction(async (ctx, request) => {
        const id = getPathId(request.url) as any;
        await ctx.runMutation(api.organizations.deleteOrg, { id });
        return jsonResponse({ success: true });
    }),
});

// Admin variation for Organizations (if any)
http.route({
    path: "/admin/organizations",
    method: "GET",
    handler: httpAction(async (ctx) => {
        const orgs = await ctx.runQuery(api.organizations.listOrgs);
        return jsonResponse(orgs);
    }),
});

// Categories
http.route({
    path: "/categories",
    method: "GET",
    handler: httpAction(async (ctx) => {
        const categories = await ctx.runQuery(api.organizations.listCategories, {});
        return jsonResponse(categories);
    }),
});

http.route({
    path: "/categories/all",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        try {
            const url = new URL(request.url);
            const organizationId = (url.searchParams.get("organization") || undefined) as any;
            const categories = await ctx.runQuery(api.organizations.listCategories, { organizationId });
            return jsonResponse(categories);
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    path: "/categories",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        const id = await ctx.runMutation(api.organizations.createCategory, data);
        return jsonResponse({ id });
    }),
});

http.route({
    pathPrefix: "/categories/",
    method: "PUT",
    handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        const data = await request.json();
        await ctx.runMutation(api.organizations.updateCategory, { id, ...data });
        return jsonResponse({ success: true });
    }),
});

http.route({
    pathPrefix: "/categories/",
    method: "DELETE",
    handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        await ctx.runMutation(api.organizations.deleteCategory, { id });
        return jsonResponse({ success: true });
    }),
});

// Departments
http.route({
    path: "/departments",
    method: "GET",
    handler: httpAction(async (ctx) => {
        try {
            const depts = await ctx.runQuery(api.organizations.listDepartments, {});
            return jsonResponse(depts);
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

// Tickets
http.route({
    path: "/tickets",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status") || undefined;
        const organizationId = (url.searchParams.get("organization") || undefined) as any;
        const tickets = await ctx.runQuery(api.tickets.list, { status, organizationId });
        return jsonResponse(tickets);
    }),
});

http.route({
    path: "/tickets",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        let title, description, category, priority, assignee;

        try {
            const formData = await request.formData();
            title = formData.get("title") as string;
            description = formData.get("description") as string;
            category = formData.get("category") as string;
            priority = formData.get("priority") as string;
            assignee = formData.get("assignee") as string;
        } catch (e) {
            // Fallback for JSON
            const data = await request.json();
            title = data.title;
            description = data.description;
            category = data.category;
            priority = data.priority;
            assignee = data.assignee;
        }

        if (!title || !description || !priority) {
            return jsonResponse({ message: "Missing required fields" }, 400);
        }

        // We use admin user as default creator for the demo, or fetch from auth header normally.
        const users = await ctx.runQuery(api.users.list, {});
        const creator = users.find(u => u.role === "admin") || users[0];
        if (!creator) return jsonResponse({ message: "No users found in db" }, 500);

        // Map Category name to ID
        let categoryId = undefined;
        if (category) {
            const categories = await ctx.runQuery(api.organizations.listCategories, { organizationId: creator.organizationId });
            const catObj = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
            if (catObj) categoryId = catObj._id;
        }

        let assignedToId = undefined;
        if (assignee) {
            const assignedUser = users.find(u => u._id === assignee || u.name === assignee);
            if (assignedUser) assignedToId = assignedUser._id;
        }

        const id = await ctx.runMutation(api.tickets.create, {
            title,
            description,
            priority,
            userId: creator._id,
            organizationId: creator.organizationId!,
            categoryId,
            departmentId: creator.departmentId,
        });

        if (assignedToId) {
            await ctx.runMutation(api.tickets.update, {
                id,
                assignedTo: assignedToId,
            });
        }

        const newTicket = await ctx.runQuery(api.tickets.getById, { id });
        return jsonResponse(newTicket);
    }),
});

http.route({
    path: "/tickets/stats/dashboard",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        try {
            const url = new URL(request.url);
            const organizationId = (url.searchParams.get("organization") || undefined) as any;
            const stats = await ctx.runQuery(api.tickets.getStats, { organizationId });
            return jsonResponse(stats);
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    pathPrefix: "/tickets/",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const ticketId = request.url.split("/").pop();
        console.log(`Handling GET /tickets/${ticketId}`);
        if (!ticketId) return jsonResponse({ message: "Missing ticket ID" }, 400);
        const ticket = await ctx.runQuery(api.tickets.getByTicketId, { ticketId });
        if (!ticket) {
            console.error(`Ticket not found: ${ticketId}`);
            return jsonResponse({ message: "Ticket not found" }, 404);
        }
        return jsonResponse(ticket);
    }),
}),

    http.route({
        pathPrefix: "/tickets/",
        method: "PUT",
        handler: httpAction(async (ctx, request) => {
            const ticketId = request.url.split("/").pop();
            if (!ticketId) return jsonResponse({ message: "Missing ticket ID" }, 400);
            const data = await request.json();

            const ticket = await ctx.runQuery(api.tickets.getByTicketId, { ticketId });
            if (!ticket) return jsonResponse({ message: "Ticket not found" }, 404);

            await ctx.runMutation(api.tickets.update, { id: ticket._id, ...data });
            const updatedTicket = await ctx.runQuery(api.tickets.getById, { id: ticket._id });
            return jsonResponse(updatedTicket);
        }),
    });

http.route({
    pathPrefix: "/tickets/",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const parts = request.url.split("/");
        const action = parts.pop();
        const ticketId = parts.pop();

        if (!ticketId) return jsonResponse({ message: "Missing ticket ID" }, 400);

        const ticket = await ctx.runQuery(api.tickets.getByTicketId, { ticketId });
        if (!ticket) return jsonResponse({ message: "Ticket not found" }, 404);

        if (action === "comments") {
            const data = await request.json();
            // Mock user for demo
            const users = await ctx.runQuery(api.users.list, {});
            const user = users.find(u => u.role === "admin") || users[0];

            const updatedTicket = await ctx.runMutation(api.tickets.addComment, {
                ticketId: ticket._id,
                userId: user._id,
                content: data.content,
                isInternal: data.isInternal || false,
            });
            return jsonResponse(updatedTicket);
        } else if (action === "approve") {
            await ctx.runMutation(api.tickets.update, { id: ticket._id, status: "approved" });
            const updatedTicket = await ctx.runQuery(api.tickets.getById, { id: ticket._id });
            return jsonResponse(updatedTicket);
        } else if (action === "reject") {
            const data = await request.json();
            await ctx.runMutation(api.tickets.update, { id: ticket._id, status: "rejected" });
            // Note: we might want to store rejection reason too, but mutation needs update
            const updatedTicket = await ctx.runQuery(api.tickets.getById, { id: ticket._id });
            return jsonResponse(updatedTicket);
        }

        return jsonResponse({ message: "Invalid action" }, 400);
    }),
});

// Admin settings
http.route({ path: "/admin/sso", method: "GET", handler: httpAction(async (ctx) => jsonResponse((await ctx.runQuery(api.admin.getSSOConfig))?.value || {})) });
http.route({
    path: "/admin/sso", method: "POST", handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        await ctx.runMutation(api.admin.setSSOConfig, { value: data });
        return jsonResponse({ success: true });
    })
});

http.route({ path: "/admin/email", method: "GET", handler: httpAction(async (ctx) => jsonResponse((await ctx.runQuery(api.admin.getEmailSettings))?.value || {})) });
http.route({
    path: "/admin/email", method: "PUT", handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        await ctx.runMutation(api.admin.setEmailSettings, { value: data });
        return jsonResponse({ success: true });
    })
});

http.route({ path: "/admin/logo", method: "GET", handler: httpAction(async (ctx) => jsonResponse((await ctx.runQuery(api.admin.getLogo))?.value || { logo: "/logo.svg" })) });
http.route({
    path: "/admin/logo", method: "POST", handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        await ctx.runMutation(api.admin.setLogo, { value: data });
        return jsonResponse({ success: true });
    })
});

http.route({ path: "/admin/sla", method: "GET", handler: httpAction(async (ctx) => jsonResponse(await ctx.runQuery(api.admin.listSLA, {}))) });
http.route({
    path: "/admin/sla", method: "POST", handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        await ctx.runMutation(api.admin.createSLA, data);
        return jsonResponse({ success: true });
    })
});

http.route({
    pathPrefix: "/admin/sla/", method: "PUT", handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        const data = await request.json();
        await ctx.runMutation(api.admin.updateSLA, { id, ...data });
        return jsonResponse({ success: true });
    })
});

http.route({
    pathPrefix: "/admin/sla/", method: "DELETE", handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        await ctx.runMutation(api.admin.deleteSLA, { id });
        return jsonResponse({ success: true });
    })
});

// Users
http.route({
    path: "/users",
    method: "GET",
    handler: httpAction(async (ctx) => {
        try {
            const users = await ctx.runQuery(api.users.list, {});
            return jsonResponse(users);
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    path: "/users",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const data = await request.json();
            const id = await ctx.runMutation(api.users.create, {
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
                status: data.status,
                organizationId: data.organization,
                departmentId: data.department || undefined,
            });
            return jsonResponse({ id });
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    pathPrefix: "/users/",
    method: "PUT",
    handler: httpAction(async (ctx, request) => {
        try {
            const id = getPathId(request.url) as any;
            const data = await request.json();
            await ctx.runMutation(api.users.update, {
                id,
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
                status: data.status,
                organizationId: data.organization,
                departmentId: data.department || undefined,
            });
            return jsonResponse({ success: true });
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});

http.route({
    pathPrefix: "/users/",
    method: "DELETE",
    handler: httpAction(async (ctx, request) => {
        try {
            const id = getPathId(request.url) as any;
            console.log(`Handling DELETE /users/${id}`);
            if (!id) return jsonResponse({ message: "Missing user ID" }, 400);
            await ctx.runMutation(api.users.remove, { id });
            return jsonResponse({ success: true });
        } catch (e: any) {
            console.error(e);
            return jsonResponse({ message: e.message || e.toString() }, 500);
        }
    }),
});


http.route({
    path: "/departments",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        const id = await ctx.runMutation(api.organizations.createDepartment, data);
        return jsonResponse({ id });
    }),
});

http.route({
    pathPrefix: "/departments/",
    method: "PUT",
    handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        const data = await request.json();
        await ctx.runMutation(api.organizations.updateDepartment, { id, ...data });
        return jsonResponse({ success: true });
    }),
});

http.route({
    pathPrefix: "/departments/",
    method: "DELETE",
    handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        await ctx.runMutation(api.organizations.deleteDepartment, { id });
        return jsonResponse({ success: true });
    }),
});

// FAQ
http.route({
    path: "/faq",
    method: "GET",
    handler: httpAction(async (ctx) => {
        const faqs = await ctx.runQuery(api.faq.list);
        return jsonResponse(faqs);
    }),
});

http.route({
    path: "/faq",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const data = await request.json();
        const id = await ctx.runMutation(api.faq.create, data);
        return jsonResponse({ id });
    }),
});

http.route({
    pathPrefix: "/faq/",
    method: "PUT",
    handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        const data = await request.json();
        await ctx.runMutation(api.faq.update, { id, ...data });
        return jsonResponse({ success: true });
    }),
});

http.route({
    pathPrefix: "/faq/",
    method: "DELETE",
    handler: httpAction(async (ctx, request) => {
        const id = request.url.split("/").pop() as any;
        await ctx.runMutation(api.faq.remove, { id });
        return jsonResponse({ success: true });
    }),
});

// Chatbot
http.route({
    path: "/chatbot/session",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const { platform } = await request.json();
        const res = await ctx.runMutation(api.chatbot.createSession, { platform });
        return jsonResponse(res);
    }),
});

http.route({
    path: "/chatbot/message",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // Handle both JSON and potentially multipart (though multipart is hard without a parser)
        const contentType = request.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data = await request.json();
            await ctx.runMutation(api.chatbot.sendMessage, {
                sessionId: data.sessionId,
                content: data.message || data.content,
                sender: data.sender || "user",
            });
            return jsonResponse({ success: true });
        }
        // Fallback for demo: just return success if multipart since we can't easily parse it here without a lib
        return jsonResponse({ success: true, message: "Demo: attachments not saved in this environment" });
    }),
});

http.route({
    path: "/chatbot/history",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const history = await ctx.runQuery(api.chatbot.getHistory, { limit });
        return jsonResponse(history);
    }),
});

http.route({
    pathPrefix: "/chatbot/session/",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const sessionId = request.url.split("/").pop() || "";
        const data = await ctx.runQuery(api.chatbot.getSession, { sessionId });
        return jsonResponse(data);
    }),
});

http.route({
    path: "/chatbot/escalate",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const { sessionId, departmentId } = await request.json();
        await ctx.runMutation(api.chatbot.escalate, { sessionId, departmentId });
        return jsonResponse({ success: true });
    }),
});

export default http;
