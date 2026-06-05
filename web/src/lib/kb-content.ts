// Knowledge Base content keyed by route pattern.
// Each entry describes a module and defines every field a user sees on that screen.

export interface KbField {
  name: string;
  definition: string;
  tip?: string;
  required?: boolean;
}

export interface KbSection {
  title: string;
  icon?: string;
  description?: string;
  fields: KbField[];
}

export interface HowToWorkflow {
  name: string;
  steps: string[];
}

export interface HowTo {
  steps?: string[];          // numbered step-by-step
  workflows?: HowToWorkflow[]; // named workflows (e.g. "Onboard a Customer")
  warnings?: string[];       // caution notes
}

export interface KbEntry {
  module: string;
  layer: string;
  badge?: string;
  description: string;
  howTo?: HowTo;             // "How to use this page"
  sections: KbSection[];
  tips?: string[];
  related?: string[];
}

// ─── Content Map ─────────────────────────────────────────────────────────────
// Key = pathname prefix (most specific match wins)

const KB: Record<string, KbEntry> = {

  // ── Control Center ─────────────────────────────────────────────────────────
  "/next-gen/control-center/customer": {
    module: "Manage Customers",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin Only",
    description: "The Customers module is the primary tenant provisioning and lifecycle management screen. Every organization on the platform is represented here as a Customer. Platform Administrators onboard, configure, suspend, and decommission customer organizations from this screen.",
    howTo: {
      steps: [
        "Click 'Add Customer' in the top right to open the onboarding form.",
        "Fill in Company Name — this auto-generates the Domain Slug (e.g. 'Acme Corp' → 'acme-corp').",
        "Select Industry and Region. Choose the correct Engagement Tier and Customer Tier.",
        "In Security Settings, enter at least one Allowed Domain (e.g. 'acme.com'). This gates who can log into the customer portal.",
        "Add at least two Initial Administrators (dual-custody policy). Enter their name, email (must match allowed domains), and job title.",
        "Click 'Create Customer'. The customer is created with 'Pending Approval' status.",
        "A second Platform Admin must open the customer and click 'Approve' to activate it.",
        "Once active, share the Customer Portal URL (shown in the detail panel) with the customer's team.",
      ],
      workflows: [
        {
          name: "Suspend a Customer",
          steps: [
            "Select the customer from the left sidebar.",
            "Click the amber 'Suspend' button in the detail header.",
            "The customer is immediately frozen — users cannot log in, automations stop.",
            "To restore, click 'Restore Access' (green button).",
          ],
        },
        {
          name: "Offboard (Hard Decommission)",
          steps: [
            "Select the customer. Click ⋮ menu → 'Hard Decommission'.",
            "The platform generates a compliance audit bundle. Download it.",
            "A second Platform Admin must confirm by clicking 'Final Decommission'.",
            "All customer data is permanently deleted after confirmation.",
          ],
        },
      ],
      warnings: [
        "The Domain Slug becomes the customer's login URL and cannot be changed after activation.",
        "Self-approval is blocked. The admin who creates a customer cannot be the one who approves it.",
        "Hard Decommission is irreversible. Always download the audit bundle first.",
      ],
    },
    sections: [
      {
        title: "Customer Identity",
        fields: [
          { name: "Company Name", definition: "The legal or trading name of the customer organization.", required: true },
          { name: "Domain Slug", definition: "URL-safe identifier used to generate the customer's dedicated login portal at /{slug}/login. Must be unique across the platform.", required: true, tip: "Use lowercase, hyphens only. Cannot be changed after activation." },
          { name: "Display Name", definition: "Friendly name shown in the UI. Can differ from Company Name — useful for abbreviations or branding." },
          { name: "Logo URL", definition: "URL to the customer's logo image. Displayed on their dedicated login portal and throughout the management console." },
          { name: "Industry", definition: "Primary industry sector of the organization. Used for analytics, reporting segmentation, and feature defaults." },
          { name: "Region", definition: "Primary geographic region of the organization. Affects data residency defaults and service routing." },
        ]
      },
      {
        title: "Configuration",
        fields: [
          { name: "Engagement Tier", definition: "Commercial engagement level: Bronze, Silver, Gold, Platinum. Controls SLA obligations, support priority, and feature access caps." },
          { name: "Classification", definition: "Organization classification type: Customer, Partner, Internal, Prospect. Affects governance rules and data handling." },
          { name: "Customer Type", definition: "Organizational structure: Enterprise, SMB, Government, Non-Profit. Determines license model and compliance requirements." },
          { name: "Customer Tier", definition: "Licensing tier: Free, Basic, Pro, Enterprise. Directly controls which platform features and service limits apply." },
        ]
      },
      {
        title: "Security Settings",
        fields: [
          { name: "Allowed Domains", definition: "Comma-separated list of email domains authorized for user registration. Enforced at the login portal — users with emails outside these domains cannot register or sign in.", tip: "Example: acme.com, storage.acme.com" },
          { name: "Auth Type", definition: "Authentication method: Email + Password, SSO Only, SAML, OIDC. Determines how users log into the customer's portal." },
          { name: "MFA Enforced", definition: "When enabled, all users in this organization must complete MFA enrollment before accessing the platform. Recommended for all production organizations." },
        ]
      },
      {
        title: "Customer Login Portal",
        fields: [
          { name: "Portal URL", definition: "The dedicated login URL for this organization: /{slug}/login. Share this with end users — it shows the customer's branding and enforces their security policy.", tip: "Use the Copy URL button to get the full URL to share with the customer." },
        ]
      },
      {
        title: "Lifecycle Status",
        fields: [
          { name: "Active", definition: "Organization is fully operational. Users can log in, automations run, all services are accessible." },
          { name: "Pending Approval", definition: "Organization has been provisioned but requires dual-custody approval from a second Platform Admin before activation." },
          { name: "Suspended", definition: "Organization is frozen. Users cannot log in, automations stop. Data is preserved. Reversible via Restore Access." },
          { name: "Hard Decommission", definition: "Irreversible offboarding process. A compliance package is generated and secured before permanent deletion. Requires two separate admin sign-offs." },
        ]
      }
    ],
    tips: [
      "Use the Copy URL button in the portal section to get the customer's login link ready to share.",
      "Dual-custody is required for all decommissioning actions — a second Platform Admin must approve.",
      "The Domain Slug drives the portal URL and cannot be changed post-activation.",
    ],
    related: ["System Control", "Licensing & Entitlements", "Tenant Governance"]
  },

  "/next-gen/control-center/system-control": {
    module: "System Control",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin Only",
    description: "System Control is the master configuration panel for the entire platform. It governs global settings, security protocols, compliance policies, infrastructure configuration, and AI model management. Only Platform Super Administrators can access this module.",
    howTo: {
      steps: [
        "Use the left navigation to move between the 7 configuration domains.",
        "Start with 'Platform Configuration' to set the platform name, timezone, currency, and session timeout defaults.",
        "Enable or disable capabilities using Feature Flags — toggle Enterprise features only if your license covers them.",
        "Go to 'Security Control' to configure SSO. Select your provider (SAML, OIDC, or LDAP) and enter the required credentials.",
        "Go to 'Platform Governance' to set data retention rules and audit policies. Enable SIEM streaming if you have an external security monitoring system.",
        "In 'AI Control', register your LLM providers and set guardrails (token limits, PII detection, content filters).",
        "In 'Service Catalog', enable or disable individual platform services. Disabled services are hidden from all customers.",
        "Always click 'Save' within each domain — changes are not auto-saved.",
      ],
      warnings: [
        "Changes to Global Settings (timezone, session timeout, password policy) affect ALL customers immediately.",
        "Disabling a Service in the catalog makes it unavailable to all customers who have it licensed.",
        "PII Redaction in AI Control should be enabled in any environment handling personal data.",
      ],
    },
    sections: [
      {
        title: "Platform Configuration",
        fields: [
          { name: "Platform Name", definition: "The display name of the platform instance. Shown in emails, the browser title, and system notifications." },
          { name: "Platform Version", definition: "Current deployed version. Used for compatibility checks during upgrades and displayed in platform footers." },
          { name: "Default Language", definition: "The fallback language for the platform UI when a user's browser language is not supported." },
          { name: "Default Timezone", definition: "Used for scheduled jobs, audit log timestamps, and notifications when no user-specific timezone is set." },
          { name: "Default Currency", definition: "The base currency for billing, usage metrics, and license cost displays." },
          { name: "Support Email", definition: "Platform-wide support contact shown in error pages, notification footers, and help links." },
          { name: "Max Tenants per Customer", definition: "Hard cap on how many tenant environments a single customer can provision. Prevents uncontrolled resource sprawl." },
          { name: "Session Timeout", definition: "How long (in minutes) a user session remains valid without any interaction before requiring re-authentication." },
          { name: "Max Login Attempts", definition: "Number of failed login attempts before an account is temporarily locked. Protects against brute-force attacks." },
          { name: "Minimum Password Length", definition: "Enforced globally across all customer organizations. Platform-level security baseline." },
        ]
      },
      {
        title: "Feature Flags",
        fields: [
          { name: "AI Copilot", definition: "Enables AI-assisted suggestions across the platform — autocomplete in the workflow builder, smart field extraction, and process recommendations." },
          { name: "Multi-Workspace", definition: "Allows customers to create multiple isolated workspaces within a single tenant. Each workspace has its own folders, projects, and access controls." },
          { name: "Human-in-the-Loop (HITL)", definition: "Enables human review and approval gates in automated processes. Required for regulated industries where full automation cannot be used." },
          { name: "Agentic AI Mode", definition: "Enables autonomous AI agents that can take multi-step actions to complete goals without step-by-step human instruction." },
          { name: "Air-Gapped Deployment", definition: "Enables offline / disconnected deployment mode where the platform operates without internet connectivity. Required for government and classified environments." },
          { name: "Multi-LLM Routing", definition: "Routes AI prompts to different LLM providers based on rules, fallback chains, or cost optimization. Requires at least two active LLM registrations." },
          { name: "Real-Time Audit Streaming", definition: "Streams audit events to an external SIEM in real time via Kafka topic or webhook. Required for SOC 2, ISO 27001, and FedRAMP compliance." },
        ]
      },
      {
        title: "Security Control — SSO",
        fields: [
          { name: "Platform Native", definition: "Users authenticate with username/password stored in the platform database. Passwords are hashed with Argon2id and never recoverable." },
          { name: "SAML 2.0", definition: "Security Assertion Markup Language. Federates authentication with enterprise identity providers like Azure AD, Okta, or Ping Identity." },
          { name: "Entity ID (SP)", definition: "The Service Provider identifier for this platform. Must be registered in the IdP as the audience restriction." },
          { name: "SSO URL (IdP)", definition: "The Identity Provider's sign-in endpoint where the platform redirects unauthenticated users." },
          { name: "IdP Certificate", definition: "The X.509 PEM certificate from your Identity Provider. Used to verify the signature on SAML assertions." },
          { name: "OIDC Issuer URL", definition: "The base URL of the OIDC provider's discovery document (e.g. https://accounts.google.com). Platform fetches /.well-known/openid-configuration automatically." },
          { name: "PKCE", definition: "Proof Key for Code Exchange. Prevents authorization code interception attacks. Should always be enabled for public clients." },
          { name: "LDAP Base DN", definition: "Distinguished Name of the root node from which all user and group searches are performed." },
          { name: "Bind DN", definition: "Service account DN used to connect to the LDAP server. This account requires read access to users and groups." },
        ]
      },
      {
        title: "AI Control",
        fields: [
          { name: "Default LLM", definition: "The AI model used for all platform-initiated AI operations unless a specific model is selected per workflow or agent." },
          { name: "Max Tokens per Request", definition: "Hard limit on prompt+completion token count per AI API call. Prevents runaway costs from oversized prompts." },
          { name: "Max Requests per Minute", definition: "Rate limit for AI API calls across all users and automations. Protects against quota exhaustion." },
          { name: "Max Agent Iterations", definition: "Maximum number of tool-use loops an AI agent can execute before the platform halts it and returns control." },
          { name: "Human Approval Threshold", definition: "If an AI agent exceeds this iteration count, a human approval gate is inserted before it can continue. Provides oversight without stopping automation entirely." },
          { name: "PII Detection", definition: "Automatically scans AI prompts and responses for personally identifiable information (names, emails, phone numbers, ID numbers)." },
          { name: "PII Redaction", definition: "When PII is detected, replaces it with anonymized placeholders before sending to the LLM. The original data never leaves the platform boundary." },
          { name: "Content Filter Level", definition: "Controls how aggressively the platform filters AI outputs for harmful, inappropriate, or policy-violating content. Off → Low → Medium → High (Strict)." },
        ]
      },
      {
        title: "Infrastructure Control",
        fields: [
          { name: "Kubernetes Provider", definition: "Target orchestration platform: EKS (AWS), AKS (Azure), GKE (Google), OpenShift, RKE2 (on-prem), or K3s (edge/air-gapped)." },
          { name: "Namespace Isolation", definition: "Each customer tenant runs in its own Kubernetes namespace. Provides network, RBAC, and resource quota isolation between customers." },
          { name: "Autoscaling", definition: "Automatically scales node count based on workload demand, between the configured minimum and maximum node counts." },
          { name: "Storage Provider", definition: "Object storage backend for files, documents, and AI model artifacts: S3, Azure Blob, Google Cloud Storage, or MinIO (self-hosted)." },
          { name: "Backup Schedule (Cron)", definition: "Cron expression defining when automated database and configuration backups run. e.g. '0 2 * * *' = daily at 2:00am UTC." },
        ]
      }
    ],
    tips: [
      "Feature flags with 'Enterprise' tier badge only apply to customers on the Enterprise plan.",
      "Changing the Default LLM takes effect immediately for all new AI operations — running workflows are not affected.",
      "Namespace Isolation is mandatory for multi-tenant SaaS deployments and cannot be disabled.",
    ],
    related: ["Manage Customers", "Licensing & Entitlements", "Service Health"]
  },

  // SSO Integration Guide — referenced by both System Control and Users & Teams
  "/next-gen/admin/access?tab=security": {
    module: "SSO Integration Guide",
    layer: "Layer 2 — Management Console",
    badge: "Customer IdP Configuration",
    description: "Step-by-step instructions for connecting your corporate Identity Provider (Azure AD, Okta, Google Workspace, or generic SAML/OIDC) to the platform for your organization's users.",
    howTo: {
      steps: [
        "Decide which protocol to use: SAML 2.0 (most enterprise IdPs), OIDC/OAuth 2.0 (modern cloud IdPs), or LDAP (on-premises Active Directory).",
        "In your Identity Provider, create a new Enterprise/SAML Application for the platform.",
        "Copy the platform's SP Entity ID and ACS URL from the configuration screen and paste them into your IdP application settings.",
        "Download the IdP's metadata XML or copy the Certificate (PEM format), SSO Login URL, and Entity ID from your IdP.",
        "Paste those values into the corresponding fields on this page.",
        "Test the connection using a non-admin user account before enabling for all users.",
        "Configure Group Mappings so that IdP groups automatically assign platform roles on first login.",
      ],
      workflows: [
        {
          name: "Microsoft Entra ID (Azure AD) — SAML",
          steps: [
            "In Azure Portal → Enterprise Applications → New Application → Create your own → 'Next Gen Platform'.",
            "In 'Single sign-on', choose SAML. Set:\n  • Identifier (Entity ID): copy from platform SP Entity ID field\n  • Reply URL (ACS URL): copy from platform ACS URL field",
            "Under 'SAML Certificates', download 'Certificate (Base64)'. This is your IdP certificate — open in a text editor and paste the full PEM content.",
            "From 'Set up Next Gen Platform' section, copy:\n  • Login URL → paste into 'SSO URL (IdP)' field\n  • Azure AD Identifier → paste into 'Issuer URL' field",
            "Name ID: Set 'Unique User Identifier' to 'user.mail' (email address format).",
            "Assign users/groups to the Enterprise Application in Azure AD.",
            "In Azure AD, go to App Registrations → your app → Certificates & Secrets to manage the certificate lifecycle.",
          ],
        },
        {
          name: "Okta — SAML 2.0",
          steps: [
            "In Okta Admin Console → Applications → Create App Integration → SAML 2.0.",
            "App name: 'Next Gen Platform'. Set:\n  • Single sign-on URL (ACS URL): copy from platform\n  • Audience URI (SP Entity ID): copy from platform",
            "Name ID format: Select 'EmailAddress'. Application username: 'Email'.",
            "In 'Attribute Statements', add: email → user.email, firstName → user.firstName, lastName → user.lastName.",
            "Click 'View Setup Instructions'. Copy:\n  • Identity Provider Single Sign-On URL → SSO URL field\n  • X.509 Certificate → IdP Certificate field (include BEGIN/END CERTIFICATE lines)",
            "Assign people or groups to the application in Okta.",
          ],
        },
        {
          name: "Google Workspace — SAML",
          steps: [
            "In Google Admin Console → Apps → Web and mobile apps → Add App → Add custom SAML app.",
            "Download the IdP metadata. From it, extract:\n  • SSO URL: the 'Location' attribute in SingleSignOnService\n  • Certificate: the X509Certificate value (wrap with BEGIN/END CERTIFICATE)",
            "In 'Service provider details', paste:\n  • ACS URL: copy from platform\n  • Entity ID: copy from platform SP Entity ID",
            "Name ID: Basic Information → Primary Email. Name ID format: EMAIL.",
            "Map attributes: primary_email → email.",
            "Turn the app ON for the relevant organizational units.",
          ],
        },
        {
          name: "Generic OIDC Provider",
          steps: [
            "In your IdP, create a new OAuth 2.0 / OIDC application. Select 'Web Application' type.",
            "Set the Redirect URI (Callback URL) to the value shown in the platform OIDC configuration screen.",
            "Copy the Client ID and Client Secret from your IdP into the platform fields.",
            "The Issuer URL is your IdP's base URL. The platform appends /.well-known/openid-configuration to auto-discover endpoints.",
            "Enable PKCE (Proof Key for Code Exchange) for added security.",
            "Required scopes: openid profile email. Add groups scope if you want group claims for role mapping.",
          ],
        },
        {
          name: "Set Up Group Mapping (end-to-end)",
          steps: [
            "Step 1 — Enable group claims in your IdP (see 'Enable Group Claims' section in the Fields tab for your specific provider).",
            "Step 2 — Find the exact group name/DN/GUID that will appear in the token. Use your IdP's test/preview feature to inspect a real token before configuring mappings.",
            "Step 3 — In the platform, under Identity Providers → Group Mapping, click 'Add Mapping'.",
            "Step 4 — Select the Identity Provider this rule applies to.",
            "Step 5 — In 'IdP Group Name', paste the exact group identifier from Step 2 (case-sensitive).",
            "Step 6 — Choose 'Map To': select 'Role' for a direct role assignment, or 'Group' to assign the user to a platform Access Group (which carries multiple roles).",
            "Step 7 — Select the target Role or Access Group from the dropdown.",
            "Step 8 — Set Priority: if a user is in multiple mapped groups, lower number = higher priority. Start with 1 for your most important rules.",
            "Step 9 — Save the mapping. Test immediately by logging in as a user who is in that IdP group. Their roles should be applied automatically on login.",
            "Step 10 — Verify: go to User Directory, find the test user, and confirm their roles match the expected mapping.",
          ],
        },
      ],
      warnings: [
        "Always test SSO with a pilot group before rolling out to all users — a misconfigured IdP can lock everyone out.",
        "IdP certificates expire. Set a calendar reminder 60 days before expiry to rotate them without disruption.",
        "The platform's SP Entity ID is case-sensitive and must exactly match what you register in your IdP.",
        "Group mapping only works if your IdP is configured to include group claims. Without this step, users authenticate but receive no automatic role assignment.",
      ],
    },
    sections: [
      {
        title: "Group Mapping — How It Works",
        description: "Group mapping runs automatically at every login. When a user authenticates via SSO, the platform reads their group claims and applies your mapping rules before granting access.",
        fields: [
          { name: "What is a Group Claim?", definition: "A group claim is data included in the SAML assertion or OIDC token by your Identity Provider that lists every group the authenticating user belongs to. The platform reads these claims and compares them against your mapping rules. Without group claims enabled in your IdP, no automatic role assignment happens." },
          { name: "IdP Group Name", definition: "The exact group identifier as it appears in the SAML/OIDC claim from your IdP. This is case-sensitive and format-dependent:\n• Azure AD / AD: Full Distinguished Name — CN=Automation-Devs,OU=Groups,DC=acme,DC=com\n• Okta: Group name (display name) — 'Automation Developers'\n• Google Workspace: Group email address — automation-devs@acme.com\n• OIDC (generic): Depends on provider — check token inspector in your IdP", required: true, tip: "Use your IdP's token preview/test feature to see exactly what group name appears in the claim. Copy it character-for-character." },
          { name: "Map To: Role", definition: "Maps the IdP group directly to a platform Role. Every user in that IdP group gets this Role on login. Best for broad, stable assignments like 'all Developers get the Developer role'." },
          { name: "Map To: Access Group", definition: "Maps the IdP group to a platform Access Group. The user inherits all roles attached to that group. Best for complex, composite access — e.g. 'Finance team' group that has multiple roles (Business User + Dashboard User + Analyst)." },
          { name: "Priority", definition: "When a user belongs to multiple IdP groups that all have mappings, rules are applied in priority order (1 = highest). Lower number = applied first. If two rules conflict, the lower priority number wins. Use priority to ensure your most specific rules are applied first." },
          { name: "JIT Provisioning", definition: "Just-in-Time provisioning automatically creates a user account in the platform the first time they log in via SSO — no manual invitation needed. The user's name, email, and group memberships are all populated from the IdP. Group mappings run immediately after the account is created." },
        ]
      },
      {
        title: "Enable Group Claims — Per Provider",
        description: "You must configure your IdP to include group membership in the authentication token before group mapping will work.",
        fields: [
          { name: "Azure AD — Groups Claim", definition: "In Azure Portal → Enterprise Applications → your app → Single sign-on → Attributes & Claims → Add a group claim.\nSelect 'Security groups' or 'All groups'.\nFor SAML, the claim name will be 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups' and the value is the Azure AD Group Object ID (GUID).\nIn the mapping rule, use the GUID: e.g. 'a1b2c3d4-...'\nAlternatively, switch to 'Group name' attribute in advanced options to use the display name instead of GUID.", tip: "Using GUIDs (Object IDs) is more stable than display names — GUIDs never change even if a group is renamed. Find the GUID in Azure AD → Groups → your group → Overview." },
          { name: "Okta — Groups Claim (SAML)", definition: "In Okta Admin → Applications → your app → General → SAML Settings → Attribute Statements.\nAdd a Group Attribute Statement:\n• Name: groups\n• Name format: Unspecified\n• Filter: Matches regex .* (to include all groups)\nThe claim name 'groups' will appear in the SAML assertion with a list of group names." },
          { name: "Okta — Groups Claim (OIDC)", definition: "In Okta Admin → Applications → your app → Sign On → OpenID Connect ID Token.\nAdd Groups claim:\n• Claim name: groups\n• Value type: Groups\n• Filter: Matches regex .* (or restrict to specific groups)\nAdd 'groups' to the scopes list in the platform OIDC configuration.", tip: "Okta group names in claims are the display names exactly as they appear in Okta. Use these names directly in your mapping rules." },
          { name: "Google Workspace — Groups Claim", definition: "Google Workspace SAML does not natively include group membership in assertions.\nWorkarounds:\n1. Use Google Cloud Identity with SAML attribute mapping (Enterprise feature)\n2. Use Google Workspace Directory API to sync group membership on a schedule\n3. Switch to OIDC with the Admin SDK and a custom claim connector\nNote: For most Google Workspace customers, LDAP or OIDC with a custom claim is the recommended approach for group mapping.", tip: "If group mapping is critical, consider Azure AD or Okta as the IdP alongside Google Workspace for authentication." },
          { name: "LDAP / Active Directory — Group Membership", definition: "With LDAP, group membership is derived directly from the directory. The platform queries the Base DN for groups matching the Group Search Filter at the configured Sync Interval.\nAD group claims use full Distinguished Names:\nCN=Automation-Devs,OU=Security Groups,DC=acme,DC=com\nThe 'memberOf' attribute on each user object lists their group DNs. Use this exact string in your mapping rule.\nTo find the DN: in Active Directory Users and Computers → right-click group → Properties → Attribute Editor → distinguishedName." },
        ]
      },
      {
        title: "SAML 2.0 Field Reference",
        fields: [
          { name: "Entity ID (SP)", definition: "Service Provider Entity ID — a unique URI that identifies this platform to your IdP. You register this value in your IdP's application configuration. Format: https://your-platform.io/saml/metadata", required: true, tip: "Copy this value exactly as shown. It is case-sensitive." },
          { name: "ACS URL", definition: "Assertion Consumer Service URL — the endpoint on the platform that receives the SAML response from your IdP after successful authentication. Format: https://your-platform.io/api/auth/saml/callback", required: true },
          { name: "SSO URL (IdP)", definition: "The Identity Provider's login endpoint where the platform redirects unauthenticated users. In Azure AD this is the 'Login URL'. In Okta it is the 'Identity Provider Single Sign-On URL'. In Google it is in the downloaded metadata XML.", required: true },
          { name: "IdP Certificate (PEM)", definition: "The X.509 certificate from your Identity Provider used to verify the digital signature on SAML assertions. Must include the -----BEGIN CERTIFICATE----- and -----END CERTIFICATE----- lines. Obtained by downloading the certificate from your IdP's SAML configuration page.", required: true, tip: "Certificates expire. Check the expiry date and set a reminder 60 days before expiry." },
          { name: "Name ID Format", definition: "How the IdP identifies the user in the SAML assertion. Options:\n• Email Address (most common) — urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress\n• Persistent — urn:oasis:names:tc:SAML:2.0:nameid-format:persistent (use when email may change)\n• Transient — new random ID each session (not recommended for this platform)", tip: "Use Email Address unless your IdP specifically requires Persistent. Persistent is preferred in regulated industries where email addresses can change." },
          { name: "Sign Authentication Requests", definition: "When enabled, the platform signs the SAML AuthnRequest sent to the IdP using the SP's private key. Provides stronger security but requires uploading the SP certificate to the IdP." },
          { name: "Encrypt Assertions", definition: "When enabled, the IdP encrypts the SAML response payload using the SP's public key. Required by some compliance frameworks (FedRAMP, HIPAA). Requires uploading the SP public certificate to your IdP." },
        ]
      },
      {
        title: "OIDC / OAuth 2.0 Field Reference",
        fields: [
          { name: "Issuer URL", definition: "The base URL of your OIDC provider. The platform automatically appends /.well-known/openid-configuration to discover all endpoints. Examples:\n• Azure AD: https://login.microsoftonline.com/{tenant-id}/v2.0\n• Okta: https://your-domain.okta.com/oauth2/default\n• Google: https://accounts.google.com", required: true },
          { name: "Client ID", definition: "The application identifier assigned by your IdP when you created the OIDC application. Visible in the application's 'General' or 'Credentials' tab in your IdP console.", required: true },
          { name: "Client Secret", definition: "The secret key paired with the Client ID. Treat this like a password — never share it or commit it to source control. Rotate it immediately if it is ever exposed.", required: true, tip: "Store this in a secrets manager, not in a config file." },
          { name: "Scopes", definition: "OAuth 2.0 scopes to request. Required: openid profile email. Add groups if you want group claims for automatic role assignment via group mappings." },
          { name: "PKCE (Proof Key for Code Exchange)", definition: "Security enhancement that prevents authorization code interception. Should always be enabled for web applications. All modern IdPs support it." },
          { name: "Auto-Provision New Users", definition: "When enabled, users who authenticate via OIDC for the first time are automatically created in the platform (JIT provisioning). If disabled, users must be manually invited before they can log in." },
        ]
      },
      {
        title: "LDAP / Active Directory Field Reference",
        fields: [
          { name: "LDAP Server", definition: "Hostname or IP of your LDAP/AD server. Use the FQDN for TLS certificate validation. Example: ldap.company.com or dc1.corp.company.internal" },
          { name: "Port", definition: "389 = standard LDAP (unencrypted). 636 = LDAPS (TLS encrypted — always use in production). 3268 = Active Directory Global Catalog (use when querying across multiple AD domains)." },
          { name: "Base DN", definition: "The Distinguished Name of the top-level organizational unit to search. All users and groups must be below this node. Example: dc=company,dc=com or ou=staff,dc=company,dc=com" },
          { name: "Bind DN", definition: "The Distinguished Name of a service account used to connect to LDAP. This account only needs read access. Example: cn=svc-nextgen,ou=serviceaccounts,dc=company,dc=com", tip: "Create a dedicated read-only service account. Never use a personal or admin account." },
          { name: "Bind Password", definition: "Password for the Bind DN service account. Stored encrypted. Rotate this password regularly and update it here when you do." },
          { name: "User Search Filter", definition: "LDAP filter to find user objects. Default: (objectClass=person). For Active Directory, use: (&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))" },
          { name: "Group Search Filter", definition: "LDAP filter to find group objects. Default: (objectClass=group). For AD: (objectClass=group)" },
          { name: "Sync Interval", definition: "How frequently (minutes) the platform polls the LDAP server to sync user and group changes. Default: 60 minutes. Set lower for organizations with frequent user changes." },
        ]
      },
    ],
    tips: [
      "Always use SAML 2.0 or OIDC over LDAP when possible — federated protocols don't require the platform to store passwords or open firewall ports to your AD.",
      "For Azure AD: use SAML for traditional enterprise SSO, or OIDC (with v2.0 endpoint) for modern apps.",
      "The IdP certificate is not the same as the TLS certificate for the website. It is the signing certificate specifically for SAML assertions.",
      "Name ID Persistent vs Email: If users may change their email addresses, use Persistent to avoid creating duplicate accounts.",
    ],
    related: ["IAM & RBAC", "System Control — Security", "Users & Teams"]
  },

  "/next-gen/control-center/licensing": {
    module: "Licensing & Entitlements",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin Only",
    description: "The Licensing module manages resource quotas, feature entitlements, and consumption limits at every level of the hierarchy: Customer, Tenant, Workspace, Service, Feature, and individual resource type. This is where capacity planning and license enforcement meet.",
    sections: [
      {
        title: "Quota Types",
        fields: [
          { name: "Bot / Robot Count", definition: "Maximum number of software robots that can be registered and active for this customer." },
          { name: "User Count", definition: "Maximum number of user accounts permitted across all tenants for this customer." },
          { name: "Workflow Count", definition: "Maximum number of workflow definitions that can be created." },
          { name: "AI Credits", definition: "Monthly AI token budget allocated to this customer across all LLM operations." },
          { name: "Storage GB", definition: "Total object storage allocation for documents, files, model artifacts, and logs." },
          { name: "Execution Minutes", definition: "Total automation execution time allowed per billing period." },
        ]
      },
      {
        title: "Plan Types",
        fields: [
          { name: "Free", definition: "No-cost tier. Limited quotas, no SLA, community support only. Intended for evaluation and development." },
          { name: "Basic", definition: "Entry-level commercial plan. Standard quotas, email support, 99.5% SLA." },
          { name: "Pro", definition: "Professional tier. Increased quotas, priority support, 99.9% SLA, access to advanced features." },
          { name: "Enterprise", definition: "Full feature access, custom quotas, dedicated support, 99.99% SLA, and compliance certifications." },
        ]
      }
    ],
    tips: [
      "Quota enforcement is hard by default — automations stop when limits are reached. Use the notification threshold to warn users before they hit the cap.",
      "Quota increases take effect immediately — no restart required.",
    ],
    related: ["Manage Customers", "System Control", "Billing & Plans"]
  },

  "/next-gen/control-center/services": {
    module: "Service Health",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin Only",
    description: "Service Health provides real-time operational visibility across every platform service — from automation engines to AI gateways, event buses, and databases. This is the platform's operational dashboard for detecting degradation, managing incidents, and reviewing uptime.",
    sections: [
      {
        title: "Health Indicators",
        fields: [
          { name: "Status", definition: "Current health state: Active (fully operational), Degraded (impaired but functional), Error (failing), Inactive (stopped)." },
          { name: "Latency", definition: "P50 response time for the most recent health check. High latency may indicate resource contention or downstream bottlenecks." },
          { name: "Uptime %", definition: "Percentage of time the service has been fully operational in the rolling 30-day window." },
          { name: "Last Check", definition: "Timestamp of the most recent automated health probe." },
        ]
      },
      {
        title: "Service Catalog",
        fields: [
          { name: "Layer 3 Services", definition: "Automation Hub services directly used by customers: Flow, App, Document Processing, Mail, Reconciliation, Investigation, Data, Quality, Release, Dashboard." },
          { name: "Layer 4 Services", definition: "Shared infrastructure services: Identity, Notification, Audit, Storage, Search, AI Gateway, Monitoring, Event Bus, Scheduling, Rules Engine, API Gateway." },
        ]
      }
    ],
    tips: [
      "A degraded service still accepts traffic but may return errors or slow responses. Investigate before it becomes a hard failure.",
      "Event Bus health is critical — if Kafka/RabbitMQ degrades, automation execution will queue but not fail immediately.",
    ],
    related: ["System Control", "Platform Monitoring"]
  },

  // ── Admin / Management Console ───────────────────────────────────────────────
  "/next-gen/admin/access": {
    module: "Users & Teams",
    layer: "Layer 2 — Management Console",
    description: "Users & Teams manages the operational identity directory for your organization. This is where you invite people, organize them into groups, approve access requests, and configure identity provider integrations. Role design and permission management live in IAM & RBAC.",
    howTo: {
      steps: [
        "Go to the 'User Directory' tab to see all users in your tenant.",
        "To invite a new user, click 'Invite User' and enter their email and name. They'll receive an activation email.",
        "Assign a Role during invitation — this controls what the user can do (see IAM & RBAC for role details).",
        "Go to 'Access Groups' to create logical groups (e.g. 'Finance Team'). Assign roles to the group — all members inherit those roles.",
        "Add users to groups from their profile or directly from the group management screen.",
        "Check 'Pending Approvals' regularly for users who self-registered and need admin activation.",
        "Configure SSO/LDAP under 'Identity Providers' to enable federated authentication for your organization.",
      ],
      workflows: [
        {
          name: "Create an Access Group",
          steps: [
            "Click 'Create Access Group' button.",
            "Enter a Group Name (e.g. 'Finance Automation Team') and description.",
            "Select one or more roles from the right panel — each role card shows its scope and permission count.",
            "Click 'Create Group'. The group is now ready to have users added to it.",
          ],
        },
      ],
      warnings: [
        "Roles assigned to a group apply to ALL members — be careful when adding broad roles like 'Tenant Admin' to a group.",
        "If SSO is configured, user creation happens automatically on first login (JIT). Set up group mappings in advance.",
      ],
    },
    sections: [
      {
        title: "User Directory",
        fields: [
          { name: "Email", definition: "Primary identifier for the user account. Must match the customer's configured Allowed Domains." },
          { name: "Full Name", definition: "Display name shown across the platform UI." },
          { name: "Status", definition: "Active: user can log in. Inactive: account disabled but data preserved. Pending: awaiting email verification or admin approval." },
          { name: "Auth Method", definition: "How this user authenticates: local (password), saml, oidc, ldap, or magic_link. Set at provisioning and can be changed by a Tenant Admin." },
          { name: "MFA Enabled", definition: "Whether this user has completed MFA enrollment. If the organization enforces MFA, users without enrollment are blocked from logging in after the grace period." },
          { name: "Last Login", definition: "Timestamp of the most recent successful authentication. Used for inactivity detection and compliance reviews." },
          { name: "Roles", definition: "Assigned roles determine what this user can do. Roles are defined in IAM & RBAC. A user can hold multiple roles simultaneously." },
          { name: "Groups", definition: "Group memberships. Permissions from all groups the user belongs to are aggregated and added to their role permissions." },
          { name: "Tenant", definition: "Which tenant this user belongs to. A user is always scoped to a single tenant for data isolation." },
        ]
      },
      {
        title: "Access Groups",
        fields: [
          { name: "Group Name", definition: "Logical grouping of users sharing common access needs. e.g. 'Finance Automation Team', 'AI Governance Board'." },
          { name: "Group Members", definition: "Users belonging to this group. All group members inherit the group's role assignments." },
          { name: "Group Roles", definition: "Roles attached to this group. Every member inherits these roles automatically — changes apply to all members instantly." },
          { name: "Identity Provider Mapping", definition: "Maps an external IdP group (e.g. Active Directory group) to this platform group. Users in the AD group are automatically added on first login via JIT provisioning." },
        ]
      },
      {
        title: "Pending Approvals",
        fields: [
          { name: "Self-Registered Users", definition: "Users who completed the email registration flow but are pending admin approval before gaining access." },
          { name: "Approval Action", definition: "Approve: grants the user access with a selected role. Reject: denies access and notifies the user by email." },
          { name: "Role Assignment at Approval", definition: "The role assigned to the user when approved. This is their starting permission set — additional roles can be added later." },
        ]
      },
      {
        title: "Identity Providers",
        fields: [
          { name: "Provider Type", definition: "Protocol used: SAML 2.0, OIDC, LDAP, Active Directory, Azure AD, Okta, Google Workspace, or custom." },
          { name: "Sync Status", definition: "Whether the last directory synchronization succeeded. LDAP/AD syncs run on a configurable interval." },
          { name: "Group Mappings", definition: "Rules that map external IdP groups to internal platform groups or roles. Applied at login via JIT provisioning." },
        ]
      }
    ],
    tips: [
      "Use groups rather than assigning roles directly to users — it makes permission changes faster and reduces mistakes.",
      "JIT provisioning creates users automatically on first SSO login. Ensure group mappings are configured before going live.",
      "Inactive users still count against your user quota. Archive users who have left the organization.",
    ],
    related: ["IAM & RBAC", "Workspace Settings"]
  },

  "/next-gen/admin/iam": {
    module: "IAM & RBAC",
    layer: "Layer 2 — Management Console",
    description: "IAM & RBAC is the access governance engine for the platform. It defines what roles exist, what each role is allowed to do, enforces Segregation of Duties rules, and manages MFA and session security policies.",
    howTo: {
      steps: [
        "Start on the 'Role Catalog' tab — 13 system roles are pre-configured with sensible defaults.",
        "Click any role in the left list to see its full permission matrix on the right.",
        "To customize: click 'Clone' on a system role to create an editable copy.",
        "Open 'Role Builder' to configure the cloned role — use the left panel for metadata (name, scope, color) and the right panel to set Allow/Deny permissions per category.",
        "Use 'Allow All' in a category to grant everything, then manually deny specific actions.",
        "Under 'Replicate to Tenants', tick which environments this role should be available in.",
        "Click 'Create Role' to save. The role is now available for assignment in Users & Teams.",
        "Go to 'SoD Rules' to define conflicts (e.g. Developer cannot also be Business Approver).",
        "Go to 'MFA & Session' to configure authentication requirements for your organization.",
      ],
      workflows: [
        {
          name: "Create a custom role",
          steps: [
            "Find the closest system role in the catalog and click its 'Clone' button.",
            "In Role Builder, rename it and adjust the description.",
            "Use the permission matrix on the right to fine-tune: green check = Allow, red X = Deny.",
            "Set 'Replicate to Tenants' if the role should appear in specific environments only.",
            "Click 'Create Role' — it now appears in the catalog tagged as 'Custom'.",
          ],
        },
        {
          name: "Add a SoD conflict",
          steps: [
            "Go to the 'SoD Rules' tab.",
            "Select Role A and Role B from the dropdowns.",
            "Set severity: HIGH blocks assignment, MEDIUM flags a warning, LOW is informational.",
            "Add a description explaining why these roles conflict.",
            "Click 'Add Rule'. The platform now enforces this constraint during role assignment.",
          ],
        },
      ],
      warnings: [
        "Platform-scoped roles can only be created by Platform Administrators.",
        "DENY always overrides ALLOW — if a user has two roles where one Allows and one Denies the same permission, Deny wins.",
        "Deleting a custom role removes it from all users and groups immediately.",
      ],
    },
    sections: [
      {
        title: "Role Catalog",
        fields: [
          { name: "System Roles", definition: "Built-in roles that ship with the platform. They cannot be deleted but can be cloned to create customized variants." },
          { name: "Custom Roles", definition: "Roles created by administrators. Can inherit from a system role base and extend or restrict permissions as needed." },
          { name: "Scope", definition: "Platform: applies across the entire platform. Customer: applies within a customer organization. Tenant: applies within a specific tenant environment." },
          { name: "Color & Icon", definition: "Visual identifiers used throughout the platform UI to make roles recognizable at a glance in user directories and audit logs." },
          { name: "Based On (Parent Role)", definition: "Optionally inherit all permissions from a system role as a starting point, then add or remove individual permissions." },
          { name: "Tenant Scope / Replicate", definition: "Attach a custom role to specific tenant environments. The role is available for assignment within those tenants only." },
        ]
      },
      {
        title: "Role Builder — Permissions",
        fields: [
          { name: "ALLOW", definition: "Grants the user the ability to perform this action. If any DENY exists anywhere in the permission hierarchy, it overrides ALLOW." },
          { name: "DENY", definition: "Explicitly blocks this action regardless of any ALLOW grants from other roles or groups. DENY always wins." },
          { name: "Unset (—)", definition: "Neither explicitly allowed nor denied. The platform defaults to deny for unset permissions unless a parent policy grants it." },
          { name: "Allow All", definition: "Bulk-grants every permission in a category. Useful when starting from a blank role that needs broad access." },
          { name: "Clear All", definition: "Removes all explicit permission grants and denials, returning the role to a blank slate." },
        ]
      },
      {
        title: "Permission Categories",
        fields: [
          { name: "Automation", definition: "Controls over workflows, bots, and automation execution: view, create, modify, execute, publish, delete." },
          { name: "AI & Intelligence", definition: "Controls over AI model lifecycle: view, train, approve, deploy, rollback, delete." },
          { name: "Identity & Access", definition: "Controls over users, roles, and groups: view, create, modify, delete, assign, impersonate." },
          { name: "Security & Compliance", definition: "Controls over security settings and audit data: view, configure, audit, export." },
          { name: "Platform Administration", definition: "Controls over platform-level configuration and licensing: restricted to Platform Super Admin by default." },
          { name: "Development", definition: "Controls over projects, workflows, and code artifacts during the development lifecycle." },
        ]
      },
      {
        title: "Permission Matrix",
        fields: [
          { name: "Matrix View", definition: "A spreadsheet-style view showing every role (columns) against every permission (rows). Green check = Allow, Red X = Deny, dash = Unset." },
          { name: "Use Case", definition: "Use the matrix for compliance audits, access reviews, and verifying that SoD rules are being respected." },
        ]
      },
      {
        title: "Segregation of Duties (SoD)",
        fields: [
          { name: "Conflict Rule", definition: "A declared incompatibility between two roles. The platform prevents a user from holding both roles simultaneously." },
          { name: "Severity", definition: "HIGH: strictly blocked, user cannot have both roles. MEDIUM: flagged as a warning but not blocked. LOW: informational only." },
          { name: "Built-in Rules", definition: "Developer ↔ Business Approver (devs cannot approve their own work), Developer ↔ Auditor, Security Admin ↔ Auditor, Tenant Admin ↔ Auditor." },
        ]
      },
      {
        title: "MFA Policy",
        fields: [
          { name: "Enforce MFA", definition: "When on, every user must enroll and pass MFA before accessing the platform. Recommended for all production organizations. Customer Admins can disable this but will see a warning." },
          { name: "Allowed Methods", definition: "Which MFA factors are accepted: TOTP (authenticator app), Email OTP, SMS OTP, Passkey/FIDO2, Magic Link, YubiKey. Enable at least two." },
          { name: "Grace Period", definition: "Number of days a newly provisioned user has to complete MFA enrollment before being locked out. 7 days is the recommended default." },
        ]
      },
      {
        title: "Session Policy",
        fields: [
          { name: "Session Timeout", definition: "How long (minutes) a session stays valid from the moment of login, regardless of activity." },
          { name: "Idle Timeout", definition: "How long (minutes) a session stays active without any user interaction before automatic logout." },
          { name: "Max Concurrent Sessions", definition: "Maximum number of active browser sessions a single user can maintain simultaneously. Exceeding this will terminate the oldest session." },
          { name: "Device Trust", definition: "Require users to register their device before accessing the platform. Unregistered devices are blocked even with valid credentials." },
          { name: "Risk-Based Authentication", definition: "The platform analyses signals (new device, unusual location, off-hours access) and requires step-up authentication when risk is elevated." },
        ]
      }
    ],
    tips: [
      "DENY always overrides ALLOW regardless of how many roles grant permission. Use DENY sparingly and document why.",
      "Clone a system role rather than building from scratch — it gives you a sensible permission baseline faster.",
      "The Permission Matrix is your best tool for quarterly access reviews — export it before and after any role changes.",
      "Enforcing MFA is strongly recommended. Customer Admins can turn it off, but the platform will show a persistent security warning.",
    ],
    related: ["Users & Teams", "Audit Chronicle", "Security Dashboard"]
  },

  "/next-gen/admin/organization": {
    module: "Workspace Settings",
    layer: "Layer 2 — Management Console",
    description: "Workspace Settings is the customer self-administration hub. This is where Customer Admins and Tenant Admins manage tenants, workspaces, folders, and applications within their organization boundary. Platform infrastructure is not visible or modifiable here.",
    sections: [
      {
        title: "Tenant Management",
        fields: [
          { name: "Tenant", definition: "An isolated environment within your organization. Common tenant types: Production (PROD), User Acceptance Testing (UAT), Staging, Development (DEV), Sandbox." },
          { name: "Tenant Code", definition: "Short unique identifier for the tenant (e.g. PROD, UAT, DEV). Used in API calls, deployment pipelines, and audit logs." },
          { name: "Tenant Type", definition: "Purpose of the environment: PROD (live users and data), UAT (acceptance testing), DEV (development), SANDBOX (experimentation)." },
          { name: "Governance Lock", definition: "When enabled, prevents any modifications to the tenant's configuration without an explicit governance unlock. Prevents accidental changes in production." },
          { name: "Default Tenant", definition: "The tenant users land in when they log in if no specific tenant is specified. Typically set to PROD." },
        ]
      },
      {
        title: "Workspace Hierarchy",
        fields: [
          { name: "Workspace", definition: "A logical container within a tenant that groups related projects, folders, and resources. Teams typically have their own workspace." },
          { name: "Folder", definition: "Organizes projects and automations within a workspace. Supports unlimited nesting depth. Permissions can be set at folder level." },
          { name: "Subfolder", definition: "Child folder. Inherits parent folder permissions by default but can have additional restrictions applied." },
          { name: "Project", definition: "The fundamental unit of work. A project contains workflows, automations, test cases, and deployment configurations." },
        ]
      },
      {
        title: "Applications",
        fields: [
          { name: "Application", definition: "A registered target application that automations interact with (e.g. SAP, Salesforce, internal web app). Stores connection config, selectors, and credential mappings." },
          { name: "Criticality", definition: "Business importance of this application: Low, Medium, High, Critical. Affects SLA enforcement and incident priority." },
          { name: "Environment Overrides", definition: "Different URLs, credentials, or configuration per environment (DEV/UAT/PROD). Ensures automations use the correct endpoints per deployment target." },
        ]
      }
    ],
    tips: [
      "Lock production tenants to prevent accidental configuration changes from developers.",
      "Use folders to mirror your business unit or team structure — it makes permission management much simpler.",
      "All automation development should happen in DEV or SANDBOX. Only promote to PROD after passing UAT.",
    ],
    related: ["Users & Teams", "IAM & RBAC"]
  },

  // ── Automation Hub ──────────────────────────────────────────────────────────
  "/next-gen/automation-studio": {
    module: "Automation Studio",
    layer: "Layer 3 — Automation Hub",
    description: "Automation Studio is the visual workflow designer for building, testing, and managing automation processes. It combines a drag-and-drop canvas with a code-capable backend, supporting BPMN-style orchestration, human task management, and AI-assisted design.",
    howTo: {
      steps: [
        "Click 'New Workflow' to open a blank canvas in the designer.",
        "Drag a Trigger Node onto the canvas to define what starts your automation (schedule, webhook, queue item, or manual).",
        "Add Action nodes and connect them by drawing lines between ports.",
        "Use Decision nodes to create conditional branches (if/else logic).",
        "Double-click any node to configure it — set credentials using Assets, not hardcoded values.",
        "Add an Error Handler node to define what happens when a step fails.",
        "Use the Variables panel to pass data between nodes.",
        "Click 'Run Test' to execute the workflow in sandbox mode and inspect each step's output.",
        "Once validated, click 'Publish' to make it available for production execution.",
      ],
      workflows: [
        {
          name: "Build a scheduled automation",
          steps: [
            "Add a Trigger node → select 'Schedule' → set the cron expression.",
            "Add Action nodes for each step of your process.",
            "Connect nodes in sequence. Use a Loop node if processing a list.",
            "Add an Error Handler to the most critical steps.",
            "Test in the DEV tenant. Publish to UAT for business validation. Promote to PROD after sign-off.",
          ],
        },
      ],
      warnings: [
        "Never hardcode credentials in node config. Always reference them via Assets.",
        "Publish only in the correct tenant — a UAT publish does not affect PROD.",
        "Governance-locked workflows cannot be modified without an unlock approval.",
      ],
    },
    sections: [
      {
        title: "Canvas Elements",
        fields: [
          { name: "Trigger Node", definition: "The entry point for every workflow. Defines what starts the automation: schedule, webhook, queue item, email received, manual, or another workflow." },
          { name: "Action Node", definition: "A discrete step the automation executes: read/write a spreadsheet, call an API, click a UI element, send an email, run a query." },
          { name: "Decision Node", definition: "A conditional branch point. Evaluates an expression and routes to one of multiple output paths based on the result." },
          { name: "Loop Node", definition: "Iterates over a list or repeats an action until a condition is met. Supports for-each, while, and count-based loops." },
          { name: "Human Task Node", definition: "Pauses the workflow and creates a task in the Action Center for a human to review, decide, or provide data before the workflow continues." },
          { name: "Sub-workflow Node", definition: "Calls another workflow as a reusable component. Changes to the sub-workflow automatically apply wherever it is used." },
          { name: "AI Node", definition: "Invokes an AI model with a prompt. The model's output becomes a variable in the workflow. Supports extraction, classification, summarization, and decision support." },
          { name: "Error Handler", definition: "Catches exceptions thrown by any node. Defines retry logic, fallback actions, or escalation paths when a step fails." },
        ]
      },
      {
        title: "Variables & Data",
        fields: [
          { name: "Input Arguments", definition: "Data passed into the workflow when it is triggered. Defined at the workflow level and visible to all nodes." },
          { name: "Output Arguments", definition: "Data the workflow returns to its caller when it completes. Used when this workflow is called as a sub-workflow." },
          { name: "Variables", definition: "Workflow-scoped storage for intermediate values. Set by any node and readable by all subsequent nodes." },
          { name: "Assets", definition: "Encrypted platform-level storage for credentials, connection strings, and secrets. Referenced by name — the actual value is never visible in the designer." },
          { name: "Queue", definition: "A structured data store for processing large volumes of items. Nodes read from queues; each item is processed once and marked complete or failed." },
        ]
      },
      {
        title: "Deployment",
        fields: [
          { name: "Draft", definition: "The workflow is being designed. Not executable in production." },
          { name: "Published", definition: "The workflow has passed governance approval and is available for production execution." },
          { name: "Governance Lock", definition: "A published workflow that has been frozen. Cannot be modified without an explicit governance unlock request." },
          { name: "Version", definition: "Every publish creates a new immutable version. Previous versions can be restored if a regression is discovered." },
        ]
      }
    ],
    tips: [
      "Use sub-workflows for any logic used in more than one place — it's the fastest way to maintain consistency.",
      "Always test in the DEV or SANDBOX tenant before publishing to PROD.",
      "Attach an Error Handler to every API call — external services fail unpredictably.",
    ],
    related: ["Bot Agents", "Action Center", "Queue Management"]
  },

  // ── Flow Studio Designer ────────────────────────────────────────────────────
  "/next-gen/studio": {
    module: "Flow Studio",
    layer: "Layer 3 — Automation Hub",
    description: "Flow Studio is the visual workflow designer. Open a project from the left panel, build your automation on the canvas by dragging activities from the Activity Library, then run or deploy.",
    howTo: {
      steps: [
        "Select a project from the left folder tree — it opens in the centre canvas.",
        "Switch the left panel to the Activity Library tab to browse available actions.",
        "Drag an activity from the library onto the canvas.",
        "Connect activities by drawing from one node's output handle to the next node's input.",
        "Click any node to configure it in the Properties panel on the right.",
        "Press Run (toolbar) to execute in debug mode — watch the spark travel edge by edge.",
        "Fix any validation errors shown by the top-right indicator, then click Deploy.",
      ],
      workflows: [
        {
          name: "Build a simple sequential flow",
          steps: [
            "Drop a Start node, then drag your activity nodes in order.",
            "Connect them left-to-right: Start → Action 1 → Action 2 → End.",
            "Set each node's inputs in the Properties panel.",
            "Click Run to verify step-by-step execution before deploying.",
          ],
        },
        {
          name: "Add conditional branching",
          steps: [
            "Drag a Decision (IF) node after the step where you need to branch.",
            "Draw a 'Yes' edge to the action to take when the condition is true.",
            "Draw a 'No' edge to an alternative action or directly to End.",
            "Set the condition in Properties — e.g. {status} == 'Approved'.",
          ],
        },
        {
          name: "Handle errors gracefully",
          steps: [
            "Wrap risky activities (API calls, file ops) in a Try Catch node.",
            "Connect the happy path inside the Try block.",
            "Connect the Catch output to a Log Message or notification step.",
            "Set Continue on Error = true on the Try Catch if the flow should proceed regardless.",
          ],
        },
      ],
      warnings: [
        "Always add a Start node — flows without one will fail validation.",
        "Never hard-code credentials. Store them as Assets and reference them by name.",
        "Test in Debug (slow) mode before deploying to production.",
      ],
    },
    sections: [
      {
        title: "Flow Control Activities",
        description: "Structural building blocks that control how execution moves through the flow.",
        fields: [
          { name: "Start", definition: "Entry point — every flow must have exactly one. Execution begins here.", tip: "Connect it directly to your first action." },
          { name: "End", definition: "Terminates the flow on that path. You can have multiple End nodes for different exit scenarios (success, error, early exit)." },
          { name: "Decision (IF)", definition: "Evaluates a Boolean expression. Routes to the Yes branch when true, No branch when false.", tip: "Use {variable} syntax to reference variables: {amount} > 1000" },
          { name: "Parallel Execute", definition: "Splits flow into concurrent branches. All branches must complete before execution continues past the merge point.", tip: "Place a second Parallel node downstream to merge branches back." },
          { name: "For Each", definition: "Iterates over a collection (list, DataTable, range). Current item is available as {item} inside the loop.", tip: "Use {index} for the zero-based position." },
          { name: "Try Catch", definition: "Catches exceptions. If any activity inside Try fails, the Catch branch runs instead of stopping the flow.", tip: "Outputs {error} and {errorMessage} in the Catch branch." },
          { name: "Log Message", definition: "Writes a message to the execution log at the chosen severity (Info / Warning / Error). Ideal for audit trails and debugging." },
          { name: "Message Box", definition: "Shows a dialog and waits for the user to click OK or Cancel. Attended automation only — not suitable for unattended robots.", tip: "Output {userResponse} contains 'OK' or 'Cancel'." },
          { name: "Break", definition: "Exits the current loop early, optionally based on a condition expression." },
        ],
      },
      {
        title: "UI Automation Activities",
        description: "Interact with desktop and web applications.",
        fields: [
          { name: "Click", definition: "Simulates a mouse click on the element matching the CSS/XPath selector or recorded coordinates.", tip: "Use Record App to auto-capture selectors from a live application." },
          { name: "Type Into", definition: "Types text into an input field keystroke by keystroke. Supports {variable} tokens and control keys like {ENTER}, {TAB}." },
          { name: "Get Text", definition: "Reads the visible text of a UI element into an output variable.", tip: "Output stored in {text} — use it in expressions or Log Message." },
          { name: "Open Browser", definition: "Launches Chrome, Edge, or Firefox and navigates to the given URL. Returns a {browserId} for subsequent web actions." },
          { name: "Extract Table", definition: "Scrapes all rows and columns from an HTML table element into a DataTable variable." },
          { name: "Wait Element", definition: "Pauses the flow until a UI element reaches the specified state (Visible, Enabled, Hidden) or the timeout is exceeded." },
        ],
      },
      {
        title: "Data & Spreadsheet Activities",
        description: "Manipulate variables, DataTables, and Excel files.",
        fields: [
          { name: "Assign", definition: "Evaluates the right-hand expression and stores the result in a named variable. Supports math and string concatenation: {price} * {qty}" },
          { name: "Filter Table", definition: "Returns a new DataTable containing only rows where the condition is true. Example condition: Status == 'Open'" },
          { name: "Build Table", definition: "Creates a new empty DataTable with the specified column names." },
          { name: "Add Data Row", definition: "Appends a row of values to an existing DataTable." },
          { name: "Lookup Table", definition: "Finds the first row in a DataTable where the named column equals the search value." },
          { name: "Sort Table", definition: "Reorders a DataTable by the specified column, ascending or descending." },
          { name: "Get Asset", definition: "Retrieves a credential, connection string, or secret from the platform's encrypted vault by asset name. Never hard-code passwords.", tip: "Output stored in {assetValue} — pass it to HTTP Request headers or database connection strings." },
        ],
      },
      {
        title: "Node Properties Reference",
        description: "Common settings available on every activity node via the Properties panel.",
        fields: [
          { name: "Display Name", definition: "Label shown on the canvas node. Does not affect execution — use it to describe what this specific instance does." },
          { name: "Timeout (ms)", definition: "Maximum milliseconds the activity may run before throwing a TimeoutException. Default: 30 000 ms (30 seconds)." },
          { name: "Retry Count", definition: "Number of automatic retries when the activity fails. Set to 3 for unstable network calls or flaky UI elements." },
          { name: "Retry Interval (ms)", definition: "Milliseconds to wait between retry attempts. Give a slow service time to recover: 2 000–5 000 ms is typical." },
          { name: "Continue on Error", definition: "When enabled, a failure is logged but the flow keeps running. Use for non-critical steps like sending an optional notification." },
          { name: "Delay Before / After (ms)", definition: "Wait before or after the activity executes. Useful to pace UI automation on slow applications." },
          { name: "Log Level", definition: "Controls what severity appears in the execution log for this step: Info (default), Warning, or Error." },
          { name: "Screenshot on Error", definition: "Captures a screenshot automatically when this activity fails. Invaluable for debugging UI automation issues remotely." },
        ],
      },
      {
        title: "Flow Tools & Canvas Formatting",
        description: "BPMN elements and layout tools in the right panel.",
        fields: [
          { name: "Decision Gateway", definition: "XOR gateway — routes to exactly one branch based on a condition. Use for if/else logic." },
          { name: "Parallel Gateway", definition: "AND gateway — splits into all branches simultaneously. Add a second Parallel node to merge them back." },
          { name: "User Task", definition: "Pauses the flow and creates an Action Center task for a human to complete before execution resumes." },
          { name: "Service Task", definition: "Automated step — an API call, file operation, database query, or any non-UI action." },
          { name: "Align Left / Right / Top / Bottom", definition: "Snaps the selected nodes' edges to match the outermost node in that direction. Select ≥2 nodes first." },
          { name: "H-Center / V-Center", definition: "Centres selected nodes around their average midpoint horizontally or vertically." },
          { name: "Distribute Horizontally / Vertically", definition: "Spaces selected nodes so the gaps between them are equal." },
          { name: "Auto-Arrange Flow", definition: "Automatically re-lays out the entire flow using a topological left-to-right sort. Existing manual positions are replaced." },
        ],
      },
    ],
    tips: [
      "Hover any activity in the Library and click the ⓘ icon to see its inline guide — When, How, Example, and Outputs.",
      "The debug Run mode slows execution to ~2 seconds per step so you can watch the spark travel edge to edge.",
      "Multi-tab support: click a workflow in the Project panel to open it in a new canvas tab without closing the current one.",
      "Use Ctrl+S to save and Ctrl+Z / Ctrl+Y for undo/redo.",
      "The Expression Builder (⤢ icon on any field) gives you a 60 % writing area with fuzzy function search and autocomplete.",
    ],
    related: ["Bot Agents", "Action Center", "Assets & Credentials"]
  },

  "/next-gen/bot-agents": {
    module: "Bot Agents",
    layer: "Layer 3 — Automation Hub",
    description: "Bot Agents manages the fleet of software robots and AI agents that execute automations. Each bot is a registered execution host that authenticates with the platform, receives job assignments, and reports results. This module covers agent lifecycle, activation, scheduling, and health.",
    sections: [
      {
        title: "Agent Identity",
        fields: [
          { name: "Hostname", definition: "The network hostname or DNS name of the machine running the bot agent software." },
          { name: "IP Address", definition: "The IP address the agent last connected from. Used for network policy enforcement and anomaly detection." },
          { name: "MAC Address", definition: "Hardware identifier of the agent machine. Used for device trust verification and license binding." },
          { name: "Fingerprint", definition: "A cryptographic identity derived from hardware characteristics. More stable than IP/MAC for long-term identity binding." },
          { name: "Activation Token", definition: "One-time secret used during initial agent registration. Generated by the platform and pasted into the agent installer. Expires after use." },
          { name: "mTLS Certificate", definition: "Mutual TLS certificate thumbprint. Agents authenticate to the platform using client certificates — this is the enrolled certificate's fingerprint." },
        ]
      },
      {
        title: "Agent Status",
        fields: [
          { name: "Online", definition: "Agent is connected and sending heartbeats. Ready to receive job assignments." },
          { name: "Offline", definition: "Agent has not sent a heartbeat within the expected interval. May be powered off or experiencing network issues." },
          { name: "Busy", definition: "Agent is currently executing a job and cannot accept new assignments." },
          { name: "Error", definition: "Agent encountered a fatal error. Check the agent logs for the root cause before restarting." },
          { name: "Heartbeat Interval", definition: "How frequently (seconds) the agent pings the platform to confirm it is alive. Default: 30 seconds." },
        ]
      },
      {
        title: "Scheduling",
        fields: [
          { name: "Cron Expression", definition: "Standard 5-field cron syntax defining when a workflow runs. e.g. '0 9 * * 1-5' = 9am Monday-Friday." },
          { name: "Trigger Type", definition: "What initiates a job: Scheduled (cron), Manual (on-demand), Queue (new queue item), Webhook (external HTTP call), or Event (platform event)." },
          { name: "Priority", definition: "Job execution priority when multiple jobs are queued: Low, Normal, High, Critical. Higher priority jobs preempt lower ones on the same agent." },
          { name: "Governance Lock", definition: "Prevents any modification to the agent's schedule or configuration without an explicit governance approval. Used for production bots." },
        ]
      }
    ],
    tips: [
      "Use mTLS for all production agents — password-based authentication is only appropriate for development.",
      "Monitor heartbeat intervals. An offline agent may mean workflows are silently failing.",
      "Always governance-lock production agents after their initial setup is verified.",
    ],
    related: ["Automation Studio", "Queue Management", "Action Center"]
  },

  "/next-gen/control-center/approvals": {
    module: "Approval Hub",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin",
    description: "The Approval Hub manages pending platform-level authorization requests that require a second platform administrator to sign off. This implements dual-custody governance for all high-risk platform operations.",
    sections: [
      {
        title: "Approval Types",
        fields: [
          { name: "Customer Activation", definition: "A new customer has been provisioned and is awaiting a second Platform Admin's approval before users can log in." },
          { name: "Service Activation", definition: "A licensed service is being enabled for a customer tenant and requires platform admin authorization." },
          { name: "Hard Decommission", definition: "A customer offboarding has been initiated. Requires a second admin to confirm before permanent data deletion proceeds." },
          { name: "Access Request", definition: "A user or admin has requested elevated permissions that require manual review before granting." },
        ]
      },
      {
        title: "Approval Fields",
        fields: [
          { name: "Requested By", definition: "The platform administrator who initiated the action requiring approval." },
          { name: "Self-Approval Block", definition: "The same person who initiated a request cannot approve it. This enforces dual-custody." },
          { name: "Approval Expiry", definition: "Some approval requests expire if not acted on within a window (e.g. 72 hours for decommission confirmations)." },
        ]
      }
    ],
    tips: [
      "You cannot approve requests you created yourself — this is intentional and cannot be bypassed.",
      "Pending decommission approvals have a countdown timer. If they expire, the decommission must be re-initiated.",
    ],
    related: ["Manage Customers", "System Control"]
  },

  "/next-gen/control-center/masters": {
    module: "Master Data",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin Only",
    description: "Master Data manages the shared lookup tables that power dropdowns, filters, and classifications across the entire platform. Changes here propagate immediately to all customers and tenants.",
    sections: [
      {
        title: "Lookup Tables",
        fields: [
          { name: "Industries", definition: "The list of industry sectors available when creating customers or filtering analytics. e.g. Banking, Insurance, Healthcare." },
          { name: "Regions", definition: "Geographic regions used for data residency, reporting segmentation, and service routing." },
          { name: "Classifications", definition: "Organization classification types: Customer, Partner, Internal, Prospect." },
          { name: "Priorities", definition: "Priority levels for support tickets, workflow jobs, and queue items: Low, Standard, High, Critical." },
          { name: "Engagement Tiers", definition: "Commercial engagement tiers used to set SLA and feature access levels: Bronze, Silver, Gold, Platinum." },
          { name: "Customer Types", definition: "Organization structure types: Enterprise, SMB, Government, Non-Profit, Startup." },
          { name: "Currencies", definition: "Supported currencies for billing and financial reporting." },
          { name: "Timezones", definition: "Available timezone options for user profiles and scheduled automations." },
        ]
      }
    ],
    tips: [
      "Deactivating a lookup value does not remove it from existing records — it only prevents it from being selected on new ones.",
      "Governance-locked values cannot be edited or deleted without an unlock approval.",
    ],
    related: ["System Control", "Manage Customers"]
  },

  "/next-gen/control-center/audit": {
    module: "Audit Chronicle",
    layer: "Layer 1 — System Control",
    badge: "Platform Admin & Auditor",
    description: "The Audit Chronicle is the platform's immutable event log. Every identity action, configuration change, automation execution, approval decision, and security event is recorded here. Audit logs are tamper-resistant and can be streamed to external SIEMs for compliance.",
    sections: [
      {
        title: "Log Entry Fields",
        fields: [
          { name: "Timestamp", definition: "UTC timestamp when the event occurred, recorded at microsecond precision." },
          { name: "Actor", definition: "The identity that performed the action: user email, service account name, or 'System' for automated platform events." },
          { name: "Action", definition: "The operation performed: LOGIN, LOGOUT, CREATE, MODIFY, DELETE, APPROVE, SUSPEND, ACTIVATE, EXECUTE, etc." },
          { name: "Target", definition: "The resource the action was performed on: customer name, user email, workflow name, etc." },
          { name: "Details", definition: "Structured detail payload containing the before/after state for modification events, error codes for failures, or contextual data." },
          { name: "IP Address", definition: "Network address the action originated from. Useful for anomaly detection and forensic investigation." },
          { name: "Severity", definition: "Info: routine event. Warning: potentially suspicious or policy-adjacent. High: security-relevant event requiring attention." },
          { name: "Chronicle Flag", definition: "Events flagged as Chronicle are high-integrity events written with an additional hash chain for tamper detection." },
        ]
      }
    ],
    tips: [
      "Use the severity filter to focus on HIGH events during security incidents.",
      "Export to CSV for external compliance reports or SIEM ingestion.",
      "Chronicle-flagged events include a cryptographic chain — any tampering is detectable by verifying the hash sequence.",
    ],
    related: ["Security Dashboard", "IAM & RBAC"]
  },

  "/next-gen/analytics": {
    module: "Analytics",
    layer: "Layer 3 — Dashboard Service",
    description: "The Analytics module provides operational intelligence across all licensed services. Dashboards are service-aware — if a service is not licensed, its metrics do not appear. All data is scoped to the user's tenant and role.",
    sections: [
      {
        title: "Dashboard Visibility Rules",
        fields: [
          { name: "Service-Aware Filtering", definition: "Only metrics for licensed and active services are shown. A customer without Document Service will not see extraction accuracy charts." },
          { name: "Tenant Scoping", definition: "All metrics are isolated to the current active tenant. Switching tenants updates all charts immediately." },
          { name: "Role Restriction", definition: "Dashboard User role allows viewing. Creating, modifying, and sharing dashboards require higher permissions set in IAM & RBAC." },
        ]
      },
      {
        title: "Metrics Categories",
        fields: [
          { name: "Automation Metrics", definition: "Workflow execution volume, success/failure rates, average execution time, queue throughput." },
          { name: "Document Metrics", definition: "Classification accuracy, extraction confidence, validation pass rate, HITL escalation rate." },
          { name: "AI Metrics", definition: "Token consumption, model accuracy, latency distribution, cost per operation." },
          { name: "Identity Metrics", definition: "Active users, failed logins, MFA adoption rate, session duration distribution." },
        ]
      }
    ],
    tips: [
      "Bookmark frequently used dashboard configurations using the Share feature — the link preserves all filter settings.",
      "Export metrics to CSV for monthly business reviews or SLA reporting.",
    ],
    related: ["Automation Studio", "Document Processing", "AI Control"]
  },

  "/next-gen/home": {
    module: "Home — Overview",
    layer: "All Layers",
    description: "The Home screen gives you a personalized summary of activity, alerts, and quick actions across all modules you have access to. What you see is determined by your role, tenant, and which services are licensed for your organization.",
    sections: [
      {
        title: "Dashboard Widgets",
        fields: [
          { name: "Recent Activity", definition: "The last 10 actions taken by you or within your team, shown in reverse chronological order." },
          { name: "Pending Actions", definition: "Items in your queue requiring attention: human tasks, approval requests, stuck automations, or access requests." },
          { name: "Service Status", definition: "Health indicator for the services your organization uses. Clicking opens the full Service Health screen." },
          { name: "Quota Usage", definition: "A snapshot of your organization's resource consumption vs. licensed limits." },
        ]
      }
    ],
    tips: [
      "Pending Actions is the fastest path to anything that is waiting for you — check it first each morning.",
    ],
    related: ["Automation Studio", "Action Center", "Analytics"]
  },
};

// ─── Resolver ─────────────────────────────────────────────────────────────────
// Returns the most specific KB entry for a given pathname.

export function getKbEntry(pathname: string): KbEntry | null {
  // Try exact match first, then progressively shorter prefixes
  const candidates = Object.keys(KB).sort((a, b) => b.length - a.length);
  for (const key of candidates) {
    if (pathname === key || pathname.startsWith(key + "?") || pathname.startsWith(key + "/")) {
      return KB[key];
    }
    if (pathname === key) return KB[key];
  }
  // Fallback: try prefix match without trailing slash
  for (const key of candidates) {
    if (pathname.startsWith(key)) return KB[key];
  }
  return null;
}

export default KB;
