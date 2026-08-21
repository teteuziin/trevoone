"use client";

import { useActionState, useState } from "react";
import { submitMissionAction, type MissionActionState } from "../actions";
import { FormField, Label, Textarea, InputHelper } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function MissionSubmissionForm({
  slug,
  missionPublicId,
  isResubmission = false,
}: {
  slug: string;
  missionPublicId: string;
  isResubmission?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<MissionActionState | null, FormData>(
    (prevState, formData) => submitMissionAction(slug, missionPublicId, prevState, formData),
    null
  );

  const [notes, setNotes] = useState("");
  const [linksText, setLinksText] = useState("");
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setSelectedFilesCount(files ? files.length : 0);
  };

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <Alert variant="danger" title="Erro no envio">
          {state.error}
        </Alert>
      )}

      {state?.success && (
        <Alert
          variant="success"
          title="Entrega enviada com sucesso!"
        >
          Aguarde a revisão e feedback da equipe da consultoria.
        </Alert>
      )}

      <FormField
        id="notes"
        label={isResubmission ? "Observações da nova entrega" : "Observações da entrega"}
        helperText={`${notes.length}/5000 caracteres`}
      >
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Descreva detalhes sobre a execução da missão, resultados, considerações ou respostas às solicitações..."
          disabled={isPending}
        />
      </FormField>

      <FormField
        id="links_text"
        label="Links de comprovação (Vídeos, posts, drives, etc.)"
        helperText="Insira um link HTTPS por linha (máximo 10 links). Vídeos grandes e gravações devem ser enviados por link externo."
      >
        <Textarea
          id="links_text"
          name="links_text"
          rows={3}
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          placeholder={"https://instagram.com/p/...\nhttps://youtube.com/watch?...\nhttps://drive.google.com/..."}
          disabled={isPending}
          className="font-mono text-xs"
        />
      </FormField>

      <div>
        <Label htmlFor="files" optional>
          Arquivos e fotos de comprovação
        </Label>
        <div className="mt-1 p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-2">
          <input
            id="files"
            name="files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={isPending}
            className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface)] file:text-[var(--text-primary)] file:border file:border-[var(--border-default)] hover:file:bg-[var(--surface-hover)] cursor-pointer disabled:opacity-60"
          />
          <InputHelper variant="default">
            Formatos permitidos: JPG, PNG, WEBP ou PDF. Máximo de 3 arquivos por envio (limite de 10 MB cada, 20 MB total).
            {selectedFilesCount > 0 && ` (${selectedFilesCount} selecionado(s))`}
          </InputHelper>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isPending}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Enviando entrega..." : isResubmission ? "Enviar nova versão" : "Enviar entrega"}
        </Button>
      </div>
    </form>
  );
}
