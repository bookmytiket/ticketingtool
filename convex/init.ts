import { mutation } from "./_generated/server";

export const seed = mutation({
    handler: async (ctx) => {
        const existingUsers = await ctx.db.query("users").collect();
        const existingFaqs = await ctx.db.query("faq").collect();
        const existingSessions = await ctx.db.query("chatbotSessions").collect();

        let orgId = null;
        let deptId = null;
        let adminId = null;
        let catId = null;

        if (existingUsers.length === 0) {
            // 1. Organizations
            orgId = await ctx.db.insert("organizations", {
                name: "Demo Corporation",
                domain: "demo.com",
                status: "active",
                settings: { theme: "light" },
                createdAt: Date.now(),
            });

            // 2. Departments
            deptId = await ctx.db.insert("departments", {
                name: "IT Support",
                organizationId: orgId,
                description: "Primary technical support team",
                isActive: true,
            });

            // 3. Categories
            catId = await ctx.db.insert("categories", {
                name: "Hardware",
                organizationId: orgId,
                description: "Physical equipment issues",
                color: "#3b82f6",
                status: "active",
                createdAt: Date.now(),
            });

            // 4. Users
            adminId = await ctx.db.insert("users", {
                name: "Demo Admin",
                email: "admin@demo.com",
                password: "admin123",
                role: "admin",
                status: "active",
                organizationId: orgId,
                departmentId: deptId,
                createdAt: Date.now(),
            });

            await ctx.db.insert("users", {
                name: "Demo Technician",
                email: "tech@demo.com",
                password: "tech123",
                role: "technician",
                status: "active",
                organizationId: orgId,
                departmentId: deptId,
                createdAt: Date.now(),
            });

            await ctx.db.insert("users", {
                name: "Demo User",
                email: "user@demo.com",
                password: "user123",
                role: "user",
                status: "active",
                organizationId: orgId,
                createdAt: Date.now(),
            });

            await ctx.db.insert("departments", {
                name: "Human Resources",
                organizationId: orgId,
                description: "Personnel and payroll",
                isActive: true,
            });

            // 5. SLA Policies
            await ctx.db.insert("slaPolicies", {
                name: "Standard Support",
                priority: "high",
                responseTime: 120,
                resolutionTime: 480,
                organizationId: orgId,
            });

            // 6. Domain Rules
            await ctx.db.insert("domainRules", {
                domain: "demo.com",
                organizationId: orgId,
                departmentId: deptId,
                priority: 1,
            });

            // 7. Settings (Logo, SSO)
            await ctx.db.insert("settings", {
                key: "logo_settings",
                value: { logo: "/logo.svg", showOnLogin: true, loginTitle: "Ticketing Portal" },
            });

            await ctx.db.insert("settings", {
                key: "sso_config",
                value: { enabled: false, provider: "google" },
            });

            // 8. Initial Tickets
            await ctx.db.insert("tickets", {
                ticketId: "TICKET-1001",
                title: "Cannot access email",
                description: "My outlook keeps crashing when I open it.",
                status: "open",
                priority: "high",
                userId: adminId,
                organizationId: orgId,
                departmentId: deptId,
                categoryId: catId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        } else {
            // Get existing context if users already existed
            const adminUser = existingUsers.find(u => u.role === "admin");
            if (adminUser) {
                adminId = adminUser._id;
                orgId = adminUser.organizationId;
            }
            if (!orgId) {
                const orgs = await ctx.db.query("organizations").collect();
                if (orgs.length > 0) orgId = orgs[0]._id;
            }
            if (!adminId && existingUsers.length > 0) {
                adminId = existingUsers[0]._id;
            }
        }

        // 9. FAQ
        if (existingFaqs.length === 0) {
            await ctx.db.insert("faq", {
                question: "How do I reset my password?",
                answer: "You can reset your password by clicking 'Forgot Password' on the login page or through your profile settings.",
                keywords: ["password", "reset", "login"],
                category: "password",
                organizationId: orgId || undefined,
                isPublished: true,
                viewCount: 12,
                helpfulCount: 5,
                createdAt: Date.now(),
            });

            await ctx.db.insert("faq", {
                question: "How to connect to VPN?",
                answer: "Use the Cisco AnyConnect client with server address vpn.demo.com and your domain credentials.",
                keywords: ["vpn", "remote", "network"],
                category: "vpn",
                organizationId: orgId || undefined,
                isPublished: true,
                viewCount: 45,
                helpfulCount: 20,
                createdAt: Date.now(),
            });
        }

        // 10. Chatbot sessions
        if (existingSessions.length === 0 && adminId) {
            const session1Id = "sess_demo_1";
            await ctx.db.insert("chatbotSessions", {
                sessionId: session1Id,
                userId: adminId,
                status: "active",
                platform: "web",
                createdAt: Date.now() - 3600000,
            });

            await ctx.db.insert("chatbotMessages", {
                sessionId: session1Id,
                sender: "user",
                content: "Hello, I need help with my VPN connection.",
                createdAt: Date.now() - 3500000,
            });

            await ctx.db.insert("chatbotMessages", {
                sessionId: session1Id,
                sender: "bot",
                content: "I can help with that! Have you tried restarting your VPN client?",
                createdAt: Date.now() - 3400000,
            });
        }

        console.log("Database seeded successfully!");
    },
});
