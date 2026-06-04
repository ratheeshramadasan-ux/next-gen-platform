import { CICDProvider } from "./providers/base";
import { GitHubProvider } from "./providers/github";

export class CICDFactory {
  /**
   * Returns a concrete implementation of a CI/CD provider based on the provider name.
   */
  static getProvider(providerName: string): CICDProvider {
    switch (providerName.toUpperCase()) {
      case "GITHUB":
        return new GitHubProvider();
      case "AZURE_DEVOPS":
        // return new AzureDevOpsProvider(); // Placeholder for future expansion
        throw new Error("Azure DevOps Provider implementation coming soon.");
      default:
        throw new Error(`Unsupported CI/CD Provider: ${providerName}`);
    }
  }
}
