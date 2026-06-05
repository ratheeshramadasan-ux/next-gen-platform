# Database Table Review

| Table / Model | Schema | Purpose | Related Tables | Used In Code? | API Used? | UI Used? | Status | Recommendation |
|---|---|---|---|---|---|---|---|---|
| Resource | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Customer | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Tenant | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| TenantConfig | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| TenantService | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| TenantAdmin | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AuditLog | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| SecurityCredential | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AppUser | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AppRole | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AppGroup | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| SubscriptionPlan | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ResourceQuota | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| IdentityProvider | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| GroupMapping | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StandardDictionary | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupIndustry | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupRegion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupClassification | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupPriority | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupCurrency | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupTimezone | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupCustomerType | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| LookupEngagementTier | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| CustomerLogFile | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| SmtpConfig | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Workspace | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| Folder | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| FolderPermission | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Project | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ProjectVersion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Asset | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AssetVersion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AssetSecretStore | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AssetTableSchema | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AssetAccessAudit | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioVariable | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioArgument | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AutomationWorkflow | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AutomationStep | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AutomationComponent | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AutomationExecutionLog | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioWorkflow | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioNode | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioConnection | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioObject | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioExecutionLog | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioStepLog | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| BotHost | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| BotSession | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioJob | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| StudioQueue | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| StudioQueueField | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioQueueCalculatedField | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioQueueSchemaVersion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioTransaction | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| StudioTransactionData | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| RagCollection | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| RagDocument | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AiModel | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| Workflow | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| WorkflowNode | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| WorkflowEdge | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ExecutionRun | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ExecutionLog | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| OrganizationSettings | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Deployment | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| Application | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ApplicationVersion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ApplicationEnvironment | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ApplicationConfig | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ApplicationDependency | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ApplicationCredentialMapping | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ApplicationParameter | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ApplicationDowntime | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ApplicationAvailabilityOverride | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ApplicationReplicationLog | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ApplicationAuditLog | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| StudioWorkflowNode | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioWorkflowEdge | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| StudioExecutionNodeLog | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| BusinessUnit | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| DiscoveryAssessment | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| DiscoveryAsset | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| DiscoveryAccount | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| DiscoveryConnector | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| DiscoveryJob | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ComplianceFramework | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ComplianceControl | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AssetComplianceMapping | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| RiskFinding | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| PamPlatform | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| PamReadiness | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| DiscoveryRecommendation | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| MasterCategory | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| MasterValue | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| IntakeConnector | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| IntakeRun | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| IntakeDocument | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| UserPersonalization | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| PlatformService | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| RoleServiceAccess | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| UserFavoriteService | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| UserRecentService | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| PlatformTheme | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AiModelRegistry | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| AiModelVersion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| AiModelRuntimeMapping | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ExtractionField | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
| ExtractionAnchor | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ExtractionRepeatRegion | public | Core entity | - | Yes | Yes | Yes | Active | KEEP |
| ExtractionTable | public | Core entity | - | Limited | Limited | Limited | Active | NEEDS REVIEW |
