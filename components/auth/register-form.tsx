"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptedTerms?: string;
  }>({});

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: typeof errors = {};

    // Validação do Nome Completo
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      newErrors.fullName = "Informe seu nome completo.";
    }

    // Validação do E-mail
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      newErrors.email = "Informe um e-mail válido.";
    }

    // Validação da Senha (mínimo 8 caracteres)
    if (!password || password.length < 8) {
      newErrors.password = "A senha deve possuir pelo menos 8 caracteres.";
    }

    // Validação da Confirmação de Senha
    if (!confirmPassword || confirmPassword !== password) {
      newErrors.confirmPassword = "As senhas não coincidem.";
    }

    // Validação dos Termos
    if (!acceptedTerms) {
      newErrors.acceptedTerms = "Você precisa aceitar os termos para continuar.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Formulário localmente válido.
      // Autenticação e criação real de conta não são executadas nesta etapa.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      {/* Campo Nome completo */}
      <div className="space-y-1 text-left">
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-zinc-700"
        >
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Digite seu nome completo"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          className={`w-full h-11 px-3.5 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
            errors.fullName ? "border-red-500" : "border-zinc-300"
          }`}
        />
        {errors.fullName && (
          <p id="fullName-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Campo E-mail */}
      <div className="space-y-1 text-left">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`w-full h-11 px-3.5 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
            errors.email ? "border-red-500" : "border-zinc-300"
          }`}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.email}
          </p>
        )}
      </div>

      {/* Campo Senha */}
      <div className="space-y-1 text-left">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700"
        >
          Senha
        </label>
        <div className="relative flex items-center">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password
                ? "password-error"
                : "password-hint"
            }
            className={`w-full h-11 pl-3.5 pr-11 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
              errors.password ? "border-red-500" : "border-zinc-300"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-zinc-500 hover:text-zinc-700 focus:outline-none focus:text-[#00A859] transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.065-7-9.542-7-4.477 0-8.268 2.943-9.542 7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {!errors.password && (
          <p id="password-hint" className="text-xs text-zinc-400 font-normal">
            Use pelo menos 8 caracteres.
          </p>
        )}
        {errors.password && (
          <p id="password-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.password}
          </p>
        )}
      </div>

      {/* Campo Confirmar senha */}
      <div className="space-y-1 text-left">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-zinc-700"
        >
          Confirmar senha
        </label>
        <div className="relative flex items-center">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            className={`w-full h-11 pl-3.5 pr-11 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
              errors.confirmPassword ? "border-red-500" : "border-zinc-300"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-zinc-500 hover:text-zinc-700 focus:outline-none focus:text-[#00A859] transition-colors"
            aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
          >
            {showConfirmPassword ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.065-7-9.542-7-4.477 0-8.268 2.943-9.542 7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p id="confirmPassword-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Aceite dos Termos de Uso */}
      <div className="pt-1 text-left space-y-1">
        <label className="flex items-start space-x-2 cursor-pointer select-none text-xs text-zinc-600 leading-normal">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (errors.acceptedTerms) setErrors((prev) => ({ ...prev, acceptedTerms: undefined }));
            }}
            aria-invalid={!!errors.acceptedTerms}
            aria-describedby={errors.acceptedTerms ? "terms-error" : undefined}
            className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-[#00A859] focus:ring-[#00A859] accent-[#00A859] cursor-pointer shrink-0"
          />
          <span>
            Li e aceito os{" "}
            <span className="font-medium text-zinc-800">Termos de Uso</span> e a{" "}
            <span className="font-medium text-zinc-800">Política de Privacidade</span>.
          </span>
        </label>
        {errors.acceptedTerms && (
          <p id="terms-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.acceptedTerms}
          </p>
        )}
      </div>

      {/* Botão Principal Criar conta */}
      <button
        type="submit"
        className="w-full h-11 mt-3 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
      >
        Criar conta
      </button>

      {/* Navegação Cadastro -> Login */}
      <div className="text-center text-xs sm:text-sm text-zinc-500 pt-3 border-t border-zinc-100">
        <span>Já possui uma conta? </span>
        <Link
          href="/login"
          className="font-semibold text-[#00A859] hover:underline focus:outline-none focus:ring-1 focus:ring-[#00A859] rounded px-1 py-0.5"
        >
          Entrar
        </Link>
      </div>
    </form>
  );
}
