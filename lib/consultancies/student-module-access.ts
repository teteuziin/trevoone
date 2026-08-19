import { resolveConsultancyContext, type AccessibleConsultancy } from "./context";
import { getStudentOnboardingStatus } from "./student-onboarding";
import {
  getStudentFinancialAccessState,
  type StudentFinancialBlockingCharge,
} from "./finance";

export type StudentModuleAccessReason =
  | "ALLOWED"
  | "UNAUTHENTICATED"
  | "INVALID_CONTEXT"
  | "NOT_STUDENT"
  | "ONBOARDING_INCOMPLETE"
  | "FINANCIALLY_RESTRICTED"
  | "PLATFORM_SUSPENDED";

export type StudentModuleAccessResult = {
  allowed: boolean;
  reason: StudentModuleAccessReason;
  context?: AccessibleConsultancy;
  confirmedRequirements: number;
  totalRequirements: number;
  isComplete: boolean;
  blockingCharge?: StudentFinancialBlockingCharge;
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

  if (context.platformAccess && !context.platformAccess.isOperationalAllowed) {
    return {
      allowed: false,
      reason: "PLATFORM_SUSPENDED",
      context,
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
    };
  }

  const isStudent = context.roles.includes("STUDENT");
  const isInfluencer = context.roles.includes("INFLUENCER");

  if (!isStudent && !isInfluencer) {
    return {
      allowed: false,
      reason: "NOT_STUDENT",
      context,
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
    };
  }

  // If membership has STUDENT role (even if also INFLUENCER), student obligations apply strictly (onboarding & finance)
  if (isStudent) {
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

    // Financial access enforcement for student
    const financialStatus = await getStudentFinancialAccessState({
      consultancyId: context.consultancyId,
      studentMembershipId: context.membershipId,
    });

    if (financialStatus.isRestricted) {
      return {
        allowed: false,
        reason: "FINANCIALLY_RESTRICTED",
        context,
        confirmedRequirements: onboardingStatus.confirmedRequirements,
        totalRequirements: onboardingStatus.totalRequirements,
        isComplete: true,
        blockingCharge: financialStatus.blockingCharge,
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

  // INFLUENCER-only: not subject to student onboarding or student financial restriction
  return {
    allowed: true,
    reason: "ALLOWED",
    context,
    confirmedRequirements: 0,
    totalRequirements: 0,
    isComplete: true,
  };
}
