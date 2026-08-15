import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import path from "node:path";
import fs from "node:fs";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveTrainingPlanForStudent } from "@/lib/consultancies/training";
import { TrainingPlanPdfDocument } from "@/lib/consultancies/training-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { slug } = await params;

  // 1. Revalidar sessão
  const session = await getCurrentSession();
  if (!session) {
    return new Response("Não autenticado.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 2. Revalidar acesso de aluno ao módulo de Treinos (tenant + role + onboarding)
  const access = await resolveStudentModuleAccess(session.userId, slug);
  if (!access.allowed || !access.context) {
    const errorMsg =
      access.reason === "ONBOARDING_INCOMPLETE"
        ? "Onboarding pendente para acessar os treinos desta consultoria."
        : access.reason === "NOT_STUDENT"
        ? "Apenas alunos matriculados podem baixar a ficha de treino."
        : "Acesso não autorizado.";
    return new Response(errorMsg, {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 3. Buscar plano ACTIVE próprio do aluno autenticado
  const plan = await getActiveTrainingPlanForStudent(session.userId, slug);
  if (!plan) {
    return new Response("Nenhum plano de treino ativo disponível no momento.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 4. Resolução segura de logo local (evitando SSRF e path traversal)
  let safeLogoPath: string | null = null;
  const logoUrl = access.context.consultancyLogoUrl;
  if (logoUrl && typeof logoUrl === "string" && logoUrl.startsWith("/") && !logoUrl.includes("..")) {
    const publicDir = path.join(process.cwd(), "public");
    const candidatePath = path.join(publicDir, logoUrl.replace(/^\/+/, ""));
    if (candidatePath.startsWith(publicDir) && fs.existsSync(candidatePath)) {
      safeLogoPath = candidatePath;
    }
  }

  try {
    // 5. Renderização do documento PDF server-side
    const element = React.createElement(TrainingPlanPdfDocument, {
      plan,
      studentName: session.fullName,
      consultancyName: access.context.consultancyName,
      consultancyLogoPath: safeLogoPath,
    }) as unknown as React.ReactElement<DocumentProps>;

    const pdfBuffer = await renderToBuffer(element);

    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `plano-de-treino-${safeSlug}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Erro na geração do PDF de treino:", error);
    return new Response("Não foi possível gerar a ficha de treino em PDF no momento.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
