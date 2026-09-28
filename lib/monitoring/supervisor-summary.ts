import { evaluateConsultancyStudents } from "./evaluator";
import { getProfessionalRadarData } from "./professional-radar";
import { getAdminReferralsData } from "@/lib/referrals/service";

export interface SupervisorSummary {
  headline: string;
  narrative: string;
  facts: {
    studentsNeedingAttention: number;
    studentsCritical: number;
    painReportsCount: number;
    prolongedInactiveCount: number;
    lowAdherenceCount: number;
    teamMembersWithPendencies: number;
    pendingCommissionsCount: number;
    pendingPayoutsCount: number;
  };
  generatedAt: Date;
}

export async function generateSupervisorSummary(
  consultancyId: number
): Promise<SupervisorSummary> {
  const [studentsResult, teamResult, referralsResult] = await Promise.all([
    evaluateConsultancyStudents(consultancyId),
    getProfessionalRadarData(consultancyId),
    getAdminReferralsData(consultancyId),
  ]);

  const studentsNeedingAttention = studentsResult.studentsAttention + studentsResult.studentsCritical;
  const studentsCritical = studentsResult.studentsCritical;

  let painReportsCount = 0;
  let prolongedInactiveCount = 0;
  let lowAdherenceCount = 0;

  for (const s of studentsResult.students) {
    for (const a of s.alerts) {
      if (a.status === "OPEN" || a.status === "ACKNOWLEDGED") {
        if (a.alertType === "PAIN_REPORTED") painReportsCount++;
        else if (a.alertType === "PROLONGED_INACTIVITY") prolongedInactiveCount++;
        else if (a.alertType === "LOW_WORKOUT_ADHERENCE") lowAdherenceCount++;
      }
    }
  }

  const teamMembersWithPendencies = teamResult.professionals.filter(
    (p) => p.status === "CRITICO" || p.status === "ATENCAO"
  ).length;

  const pendingCommissionsCount = referralsResult.commissions.filter(
    (c) => c.status === "PENDING"
  ).length;
  const pendingPayoutsCount = referralsResult.commissions.filter(
    (c) => c.status === "APPROVED"
  ).length;

  // Build deterministic, evidence-based narrative
  const paragraphs: string[] = [];

  // Paragraph 1: Students situation
  if (studentsNeedingAttention === 0) {
    paragraphs.push(
      "Hoje a consultoria opera com todos os alunos em dia e em conformidade com as rotinas prescritas no TREVO ONE."
    );
  } else {
    const details: string[] = [];
    if (painReportsCount > 0) {
      details.push(`${painReportsCount} relatou(aram) dor ou desconforto em check-in recente`);
    }
    if (lowAdherenceCount > 0) {
      details.push(`${lowAdherenceCount} apresenta(m) baixa frequência de treinos nos últimos 5 dias`);
    }
    if (prolongedInactiveCount > 0) {
      details.push(`${prolongedInactiveCount} está(ão) sem atividade ou treino registrado há mais de 7 dias`);
    }

    let detailStr = "";
    if (details.length > 0) {
      detailStr = ` Dentre eles, ${details.join(", ")}.`;
    }

    paragraphs.push(
      `Hoje existem ${studentsNeedingAttention} aluno(s) que merece(m) atenção na consultoria (${studentsCritical} em estado crítico).${detailStr}`
    );
  }

  // Paragraph 2: Professional Team situation
  if (teamMembersWithPendencies > 0) {
    paragraphs.push(
      `Na equipe técnica, ${teamMembersWithPendencies} profissional(is) possui(em) alertas críticos sem tratamento ou alunos sem acompanhamento registrado no TREVO ONE nos últimos 7 dias.`
    );
  } else {
    paragraphs.push(
      "A equipe técnica está com o acompanhamento de seus alunos em dia no sistema."
    );
  }

  // Paragraph 3: Referrals & Commissions
  if (pendingCommissionsCount > 0 || pendingPayoutsCount > 0) {
    paragraphs.push(
      `No programa de indicações, há ${pendingCommissionsCount} comissão(ões) aguardando aprovação e ${pendingPayoutsCount} pagamento(s) aprovado(s) aguardando liquidação PIX.`
    );
  }

  const headline = studentsNeedingAttention === 0
    ? "Operação estável e sem pendências críticas hoje"
    : `${studentsNeedingAttention} aluno(s) demandam atenção da coordenação hoje`;

  return {
    headline,
    narrative: paragraphs.join(" "),
    facts: {
      studentsNeedingAttention,
      studentsCritical,
      painReportsCount,
      prolongedInactiveCount,
      lowAdherenceCount,
      teamMembersWithPendencies,
      pendingCommissionsCount,
      pendingPayoutsCount,
    },
    generatedAt: new Date(),
  };
}

export const generateSupervisorDailySummary = generateSupervisorSummary;
