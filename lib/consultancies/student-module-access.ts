import { resolveConsultancyContext, type AccessibleConsultancy } from "./context";
import { getStudentOnboardingStatus } from "./student-onboarding";

export type StudentModuleAccessReason =
  | "ALLOWED"
  | "UNAUTHENTICATED"
  | "INVALID_CONTEXT"
  | "NOT_STUDENT"
  | "ONBOARDING_INCOMPLETE";

export type StudentModuleAccessResult = {
  allowed: boolean;
  reason: StudentModuleAccessReason;
  context?: AccessibleConsultancy;
  confirmedRequirements: number;
  totalRequirements: number;
  isComplete: boolean;
};

export async function resolveStudentModuleAccess(
  userId: number,
  consultancySlug: string
): Promise<StudentModuleAccessResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return {
      allowed: false,
      reason: "UNAUTHENTICATED",
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
    };
  }

  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return {
      allowed: false,
      reason: "INVALID_CONTEXT",
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
    };
  }

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    return {
      allowed: false,
      reason: "INVALID_CONTEXT",
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
    };
  }

  const isStudent = context.roles.includes("STUDENT");
  if (!isStudent) {
    return {
      allowed: false,
      reason: "NOT_STUDENT",
      context,
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
    };
  }

  const onboardingStatus = await getStudentOnboardingStatus(userId, consultancySlug);

  if (!onboardingStatus.isComplete) {
    return {
      allowed: false,
      reason: "ONBOARDING_INCOMPLETE",
      context,
      confirmedRequirements: onboardingStatus.confirmedRequirements,
      totalRequirements: onboardingStatus.totalRequirements,
      isComplete: false,
    };
  }

  return {
    allowed: true,
    reason: "ALLOWED",
    context,
    confirmedRequirements: onboardingStatus.confirmedRequirements,
    totalRequirements: onboardingStatus.totalRequirements,
    isComplete: true,
  };
}
