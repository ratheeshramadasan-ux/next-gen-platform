import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // In a real app, you would get this from auth context (e.g., getServerSession)
    // For this demonstration, we'll assume a dummy or fetch the first user.
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // Load personalization
    let personalization = await prisma.userPersonalization.findFirst({
      where: { userId }
    });

    if (!personalization) {
      // Create default
      personalization = await prisma.userPersonalization.create({
        data: { userId }
      });
    }

    // Load available services
    let services = await prisma.platformService.findMany({
      where: { enabled: true },
      orderBy: { displayOrder: "asc" }
    });

    if (services.length === 0) {
      // Seed default enterprise services
      await prisma.platformService.createMany({
        data: [
          { serviceKey: "doc-intel", displayName: "Document Intelligence", description: "OCR, Classification, Extraction", iconType: "document-scan", accentColor: "#06b6d4", route: "/next-gen/studio/document-reader" },
          { serviceKey: "automation", displayName: "Automation Builder", description: "Visual node workflows", iconType: "git-merge", accentColor: "#8b5cf6", route: "/next-gen/automation-studio/designer" },
          { serviceKey: "ai-hub", displayName: "AI Hub", description: "Model governance & prompt engineering", iconType: "brain", accentColor: "#ec4899", route: "/next-gen/control-center/ai-engine" },
          { serviceKey: "execution", displayName: "Execution Center", description: "Queue management & live logs", iconType: "activity", accentColor: "#10b981", route: "/next-gen/control-center/execution" },
          { serviceKey: "governance", displayName: "Governance Matrix", description: "Compliance & security policies", iconType: "shield-alert", accentColor: "#f59e0b", route: "/next-gen/control-center/audit" }
        ]
      });
      services = await prisma.platformService.findMany({
        where: { enabled: true },
        orderBy: { displayOrder: "asc" }
      });
    }

    // Ensure Icon Repository is always seeded and returned
    const hasIconRepo = services.some(s => s.serviceKey === "icon-repo");
    if (!hasIconRepo) {
      try {
        const iconRepoService = await prisma.platformService.create({
          data: {
            serviceKey: "icon-repo",
            displayName: "Icon Repository",
            description: "Explore premium and customizable platform icon sets",
            iconType: "compass",
            accentColor: "#00D1FF",
            route: "/next-gen/settings/icons",
            displayOrder: 6,
            enabled: true
          }
        });
        services.push(iconRepoService);
      } catch (e) {
        console.error("Failed to seed icon repository service dynamically:", e);
      }
    }

    // Load themes
    const themes = await prisma.platformTheme.findMany();

    // Load favorites
    const favorites = await prisma.userFavoriteService.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" }
    });

    // Load recent
    const recentServices = await prisma.userRecentService.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: "desc" },
      take: 10
    });

    return NextResponse.json({
      user: { id: userId },
      personalization,
      services,
      favorites,
      recentServices,
      themes,
      permissions: { "all": true } // Mock RBAC for now
    });
  } catch (error: any) {
    console.error("Bootstrap API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
