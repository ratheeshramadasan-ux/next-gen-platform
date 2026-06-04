export interface CICDProvider {
  /**
   * Dispatches a deployment trigger to the external provider.
   * @param payload Deployment details including repo, branch, and version.
   */
  dispatchDeployment(payload: {
    repoName: string;
    repoUrl: string;
    branch: string;
    version: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; externalId?: string; error?: string }>;

  /**
   * Fetches the current status of an external deployment.
   * @param externalId The ID returned during dispatch.
   */
  getDeploymentStatus(externalId: string): Promise<{ status: string; url?: string }>;
}
