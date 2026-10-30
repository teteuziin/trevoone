import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import {
  getChatConsultationByPublicId,
  listChatMessages,
} from "@/lib/consultancies/trevo-chat";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { slug } = await params;
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return NextResponse.json({ error: "Consultoria não encontrada." }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const chatPublicId = searchParams.get("chat");
  if (!chatPublicId) {
    return NextResponse.json({ error: "Parâmetro 'chat' obrigatório." }, { status: 400 });
  }

  const chat = await getChatConsultationByPublicId(context.consultancyId, chatPublicId);
  if (!chat) {
    return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });
  }

  const isStudent = context.membershipId === chat.studentMembershipId;
  const isProf = context.membershipId === chat.professionalMembershipId;
  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN") || isPlatformAdmin;

  if (!isStudent && !isProf && !isAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const rawLimit = Number(searchParams.get("limit") || 50);
  const limit = Math.min(Math.max(rawLimit, 1), 100);
  const rawBeforeId = searchParams.get("beforeId");
  const beforeId = rawBeforeId && !isNaN(Number(rawBeforeId)) ? Number(rawBeforeId) : undefined;

  const messages = await listChatMessages(chat.id, limit, beforeId);
  return NextResponse.json({ messages });
}
