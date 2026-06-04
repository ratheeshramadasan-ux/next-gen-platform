import { onboardTenantAction } from '/Users/ratheesh/next-gen-platform/web/src/app/actions/tenantActions';

async function run() {
  try {
    console.log("Starting test onboard...");
    const res = await onboardTenantAction({
      companyName: "Test Company",
      industry: "Technology",
      location: "US",
      classification: "Customer",
      priority: "Standard",
      customerType: "Enterprise",
      customerTier: "Enterprise",
      engagementTier: "Bronze",
      authType: "Email + Password",
      allowedDomains: "test.com",
      complianceMode: "Standard",
      planType: "Free",
      tenantAdmins: [
        { firstName: "Admin", lastName: "One", email: "admin1@test.com" },
        { firstName: "Admin", lastName: "Two", email: "admin2@test.com" }
      ],
      workspaceName: "Test Workspace",
      workspaceLanguage: "en",
      bootstrapTemplate: "None",
      createdByEmail: "superadmin@test.com",
    });
    console.log("Result:", res);
  } catch (e) {
    console.error("Script error:", e);
  }
}

run();
