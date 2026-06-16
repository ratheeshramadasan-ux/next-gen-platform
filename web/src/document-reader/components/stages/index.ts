/**
 * Stage components barrel — Phase I DU reorganization
 *
 * Re-exports from WorkflowStages.tsx so each stage can be imported
 * by name without knowing the source file.
 *
 * Usage:
 *   import { DocumentIntake, TrainingReview } from "@/document-reader/components/stages";
 */

export {
  DocumentIntake,
  RoutingPolicies,
  InfrastructureRegistry,
  TrainingReview,
} from "../WorkflowStages";

export { PublishStudio } from "../../publish/PublishStudio";
export { ScheduleConfig } from "../../publish/ScheduleConfig";
export { AccessManagement } from "../../access/AccessManagement";
export { DUDashboard } from "../../dashboard/DUDashboard";
