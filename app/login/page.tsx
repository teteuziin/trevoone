import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAccount } from "./actions";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    return (
      <AuthShell
        title="Sessão Ativa"
        subtitle="Você já está autenticado no Trevo One."
      >
        <div className="w-full space-y-5 text-center py-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-[#00A859] flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-900">
              Login realizado com sucesso.
            </h3>
            <p className="text-sm text-zinc-600">
              Sua sessão está ativa como{" "}
              <span className="font-medium text-zinc-900">{session.fullName}</span> (
              <span className="text-zinc-700">{session.email}</span>).
            </p>
          </div>
          <form action={logoutAccount} className="pt-2">
            <button
              type="submit"
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              Sair
            </button>
          </form>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para acessar o Trevo One."
    >
      <LoginForm />
    </AuthShell>
  );
}
