import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import {
  ServerTrainingPdfDocument,
  type PresentedTrainingPlan,
} from "./server-training-pdf-document";

/**
 * Server-only utility to render a vector PDF document to Buffer.
 * Must only be called within Node.js runtime environments (Route Handlers, Server Actions).
 * Strictly avoids browser automation (no Puppeteer, no Playwright, no Chrome).
 */
export async function generateTrainingPlanPdfBuffer(
  plan: PresentedTrainingPlan
): Promise<Buffer> {
  const documentElement = React.createElement(ServerTrainingPdfDocument, { plan });
  return await renderToBuffer(
    documentElement as unknown as React.ReactElement<DocumentProps>
  );
}

export function createSafeTrainingPdfFilename(
  prefix: string,
  targetName?: string | null
): string {
  const cleanName = (targetName || "Geral")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const cleanPrefix = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `trevoone-${cleanPrefix}-${cleanName}.pdf`;
}
