"use client";

import React, { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserProfileData } from "@/lib/account/user-profile";
import {
  updateUsernameAction,
  uploadProfilePhotoAction,
  removeProfilePhotoAction,
} from "@/app/conta/perfil/actions";
import { UserAvatar } from "@/components/account/user-avatar";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export interface UserProfileFormProps {
  initialProfile: UserProfileData;
}

export function UserProfileForm({ initialProfile }: UserProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data state
  const [profile, setProfile] = useState<UserProfileData>(initialProfile);
  const [usernameInput, setUsernameInput] = useState(
    initialProfile.customUsername || ""
  );

  // UI state for username
  const [usernameFeedback, setUsernameFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isUsernamePending, startUsernameTransition] = useTransition();

  // UI state for photo
  const [photoFeedback, setPhotoFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPhotoPending, startPhotoTransition] = useTransition();

  // Handle Username Save
  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUsernamePending) return;

    setUsernameFeedback(null);
    const trimmed = usernameInput.trim().replace(/^@+/, "");

    if (!trimmed) {
      setUsernameFeedback({
        type: "error",
        message: "Por favor, digite um nome de usuário.",
      });
      return;
    }

    startUsernameTransition(async () => {
      try {
        const res = await updateUsernameAction(trimmed);
        if (!res.success) {
          setUsernameFeedback({
            type: "error",
            message: res.error || "Não foi possível salvar o nome de usuário.",
          });
        } else {
          setUsernameFeedback({
            type: "success",
            message: "Nome de usuário atualizado com sucesso!",
          });
          setProfile((prev) => ({
            ...prev,
            customUsername: res.username || trimmed,
            effectiveUsername: res.effectiveUsername || `@${trimmed}`,
          }));
          router.refresh();
        }
      } catch {
        setUsernameFeedback({
          type: "error",
          message: "Falha na conexão ao salvar nome de usuário. Tente novamente.",
        });
      }
    });
  };

  // Handle File Selection and Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = "";

    setPhotoFeedback(null);

    // Client-side quick size check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoFeedback({
        type: "error",
        message: "O arquivo selecionado excede o limite máximo permitido de 5 MB.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    startPhotoTransition(async () => {
      try {
        const res = await uploadProfilePhotoAction(formData);
        if (!res.success) {
          setPhotoFeedback({
            type: "error",
            message: res.error || "Não foi possível atualizar a foto de perfil.",
          });
        } else {
          setPhotoFeedback({
            type: "success",
            message: "Foto de perfil atualizada com sucesso!",
          });
          setProfile((prev) => ({
            ...prev,
            hasProfilePhoto: true,
            profilePhotoUpdatedAt: res.profilePhotoUpdatedAt || new Date(),
          }));
          router.refresh();
        }
      } catch {
        setPhotoFeedback({
          type: "error",
          message: "Ocorreu um erro ao enviar a imagem. Tente novamente.",
        });
      }
    });
  };

  // Handle Remove Photo
  const handleRemovePhoto = () => {
    if (isPhotoPending || !profile.hasProfilePhoto) return;

    setPhotoFeedback(null);
    startPhotoTransition(async () => {
      try {
        const res = await removeProfilePhotoAction();
        if (!res.success) {
          setPhotoFeedback({
            type: "error",
            message: res.error || "Não foi possível remover a foto.",
          });
        } else {
          setPhotoFeedback({
            type: "success",
            message: "Foto de perfil removida com sucesso.",
          });
          setProfile((prev) => ({
            ...prev,
            hasProfilePhoto: false,
            profilePhotoUpdatedAt: null,
          }));
          router.refresh();
        }
      } catch {
        setPhotoFeedback({
          type: "error",
          message: "Ocorreu um erro ao remover a foto. Tente novamente.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Photo & Identity Section */}
      <section
        aria-labelledby="profile-photo-heading"
        className="p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-6"
      >
        <div className="space-y-1">
          <h2
            id="profile-photo-heading"
            className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight"
          >
            Foto de perfil
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Sua foto é visível nos menus e ambientes da plataforma.
          </p>
        </div>

        {/* Photo feedback */}
        {photoFeedback && (
          <Alert
            variant={photoFeedback.type === "success" ? "success" : "danger"}
            title={photoFeedback.type === "success" ? "Sucesso" : "Atenção"}
          >
            <p className="text-xs">{photoFeedback.message}</p>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar display */}
          <div className="relative shrink-0 self-center sm:self-auto">
            <UserAvatar
              fullName={profile.fullName}
              hasProfilePhoto={profile.hasProfilePhoto}
              profilePhotoUpdatedAt={profile.profilePhotoUpdatedAt}
              size="2xl"
              className="border-2 border-[var(--brand-soft-border)] shadow-md"
            />
          </div>

          {/* Upload & Remove Controls */}
          <div className="space-y-3 flex-1 min-w-0 text-center sm:text-left">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                {profile.fullName}
              </p>
              <p className="text-xs font-semibold text-[var(--brand)]">
                {profile.effectiveUsername}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isPhotoPending}
                id="profile-photo-file-input"
              />

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isPhotoPending}
                isLoading={isPhotoPending}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-4 font-semibold"
              >
                {isPhotoPending
                  ? "Enviando..."
                  : profile.hasProfilePhoto
                  ? "Trocar foto"
                  : "Enviar foto"}
              </Button>

              {profile.hasProfilePhoto && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPhotoPending}
                  onClick={handleRemovePhoto}
                  className="min-h-[44px] px-4 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50/20"
                >
                  Remover foto
                </Button>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-tertiary)] pt-0.5">
              Formatos aceitos: JPG, PNG ou WEBP. Tamanho máximo de 5 MB.
            </p>
          </div>
        </div>
      </section>

      {/* Username Configuration Section */}
      <section
        aria-labelledby="username-heading"
        className="p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-5"
      >
        <div className="space-y-1">
          <h2
            id="username-heading"
            className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight"
          >
            Nome de usuário (@username)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Escolha uma identificação única para seu perfil no Trevo One.
          </p>
        </div>

        {/* Username feedback */}
        {usernameFeedback && (
          <Alert
            variant={usernameFeedback.type === "success" ? "success" : "danger"}
            title={usernameFeedback.type === "success" ? "Sucesso" : "Atenção"}
          >
            <p className="text-xs">{usernameFeedback.message}</p>
          </Alert>
        )}

        <form onSubmit={handleSaveUsername} className="space-y-4" noValidate>
          <div className="space-y-1.5 max-w-md">
            <label
              htmlFor="username-input"
              className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)]"
            >
              Identificador (@)
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-[var(--brand)] pointer-events-none select-none">
                @
              </span>
              <input
                id="username-input"
                name="username"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="seu.nome"
                maxLength={30}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={isUsernamePending}
                className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors"
              />
            </div>

            <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
              3 a 30 caracteres. Letras minúsculas (a-z), números (0-9), ponto (.) e sublinhado (_).
            </p>
          </div>

          <div className="pt-2 flex justify-start">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isUsernamePending}
              isLoading={isUsernamePending}
              className="min-h-[44px] px-6 font-semibold"
            >
              {isUsernamePending ? "Salvando..." : "Salvar nome de usuário"}
            </Button>
          </div>
        </form>
      </section>

      {/* Account Info & Security Link */}
      <section
        aria-labelledby="account-info-heading"
        className="p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4"
      >
        <div className="space-y-1">
          <h2
            id="account-info-heading"
            className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight"
          >
            Dados cadastrais
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Informações associadas à sua conta principal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Nome completo</span>
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{profile.fullName}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">E-mail de acesso</span>
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{profile.email}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Deseja alterar sua senha?</span>
          <Link
            href="/conta/seguranca"
            className="inline-flex items-center text-xs font-semibold text-[var(--brand)] hover:underline min-h-[44px]"
          >
            Acessar Conta e Segurança →
          </Link>
        </div>
      </section>
    </div>
  );
}
