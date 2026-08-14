import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { getInvitationPreviewByToken } from "@/lib/consultancies/invitations";
import { ADMIN_ROLE_LABELS } from "@/lib/consultancies/admin";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { ConsultancyLogo } from "@/components/brand/consultancy-logo";
import { InvitationAcceptForm } from "@/components/consultancies/invitation-accept-form";
import { logoutAndReturnToInvitationAction } from "./actions";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ConvitePage({ params }: PageProps) {
  const { token } = await params;

  const session = await getCurrentSession();
  const preview = await getInvitationPreviewByToken(token);

  // 1. Estado INVALID
  if (preview.status === "INVALID") {
    return (
      <main className="min-h-svh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
        <div className="w-full max-w-[440px] mx-auto flex flex-col items-center space-y-6 text-center">
          <div className="w-[130px] sm:w-[150px] shrink-0">
            <TrevoOneLogo priority size={150} />
          </div>

          <div className="w-full space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Convite indisponível
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Este convite é inválido ou não está mais disponível.
            </p>
          </div>

          <div className="w-full pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              Ir para o início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 2. Estados EXPIRED, REVOKED, ACCEPTED
  if (
    preview.status === "EXPIRED" ||
    preview.status === "REVOKED" ||
    preview.status === "ACCEPTED"
  ) {
    const title =
      preview.status === "ACCEPTED"
        ? "Este convite já foi utilizado."
        : preview.status === "REVOKED"
        ? "Este convite foi revogado."
        : "Este convite expirou.";

    const description =
      preview.status === "ACCEPTED"
        ? "Este convite já foi aceito e vinculado a uma conta."
        : preview.status === "REVOKED"
        ? "Este convite foi revogado pela consultoria. Solicite um novo link se necessário."
        : "O prazo de validade deste convite expirou. Solicite um novo convite à consultoria.";

    return (
      <main className="min-h-svh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-white text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
        <div className="w-full max-w-[440px] mx-auto flex flex-col items-center space-y-6 text-center">
          <ConsultancyLogo
            logoUrl={preview.consultancyLogoUrl}
            name={preview.consultancyName}
            size={64}
          />

          <div className="w-full space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              {title}
            </h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="w-full p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2 text-left">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Consultoria
            </p>
            <p className="text-sm font-bold text-zinc-900">
              {preview.consultancyName}
            </p>
          </div>

          <div className="w-full pt-2">
            <Link
              href={session ? "/selecionar-consultoria" : "/login"}
              className="inline-flex items-center justify-center w-full h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {session ? "Acessar consultorias" : "Entrar na minha conta"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 3. Estado PENDING
  const userEmail = session?.email ? session.email.trim().normalize("NFC").toLowerCase() : null;
  const invitedEmail = preview.invitedEmail.trim().normalize("NFC").toLowerCase();
  const isEmailMatching = userEmail === invitedEmail;

  return (
    <main className="min-h-svh w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-zinc-50/50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <div className="w-full max-w-[440px] mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center space-y-6 text-center">
        <ConsultancyLogo
          logoUrl={preview.consultancyLogoUrl}
          name={preview.consultancyName}
          size={64}
        />

        <div className="w-full space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#008f4c] border border-emerald-200">
            Convite para consultoria
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            {preview.consultancyName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
            Você recebeu um convite para entrar em {preview.consultancyName}.
          </p>
        </div>

        {/* Funções atribuídas no convite */}
        <div className="w-full p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-2.5 text-left">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Suas funções na consultoria
          </p>
          <div className="flex flex-wrap gap-1.5">
            {preview.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#008f4c] border border-emerald-200 shadow-2xs"
              >
                {ADMIN_ROLE_LABELS[role] || role}
              </span>
            ))}
          </div>
        </div>

        {/* CENÁRIO A: Usuário não autenticado */}
        {!session && (
          <div className="w-full space-y-3 pt-2">
            <p className="text-xs text-zinc-500">
              Entre na sua conta ou crie uma nova para aceitar o convite.
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <Link
                href={`/login?returnTo=/convite/${encodeURIComponent(token)}`}
                className="inline-flex items-center justify-center w-full h-11 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
              >
                Já tenho conta
              </Link>
              <Link
                href={`/cadastro?returnTo=/convite/${encodeURIComponent(token)}`}
                className="inline-flex items-center justify-center w-full h-11 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 text-zinc-800 font-semibold text-sm rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}

        {/* CENÁRIO B: Usuário autenticado com e-mail DIFERENTE */}
        {session && !isEmailMatching && (
          <div className="w-full space-y-4 pt-2">
            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium text-left leading-relaxed space-y-1">
              <p className="font-semibold text-amber-950">
                Este convite pertence a outra conta.
              </p>
              <p className="text-amber-800">
                Você está conectado como <span className="font-semibold">{session.email}</span>. Para aceitar, saia e entre com o e-mail que recebeu o convite.
              </p>
            </div>

            <form action={logoutAndReturnToInvitationAction.bind(null, token)} className="w-full">
              <button
                type="submit"
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                Sair e entrar com outra conta
              </button>
            </form>
          </div>
        )}

        {/* CENÁRIO C: Usuário autenticado com o MESMO e-mail */}
        {session && isEmailMatching && (
          <div className="w-full space-y-3 pt-2">
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs text-left">
              Conectado como <span className="font-semibold">{session.email}</span>
            </div>
            <InvitationAcceptForm token={token} />
          </div>
        )}
      </div>
    </main>
  );
}
