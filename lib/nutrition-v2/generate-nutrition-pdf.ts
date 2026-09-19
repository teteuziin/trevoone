import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { ServerPdfDocument } from "./server-pdf-document";
import type { PresentedNutritionPlan } from "./nutrition-plan-presentation";

/**
 * Server-only utility to render a vector PDF document to Buffer.
 * Must only be called within Node.js runtime environments (Route Handlers, Server Actions).
 */
export async function generateNutritionPlanPdfBuffer(
  plan: PresentedNutritionPlan
): Promise<Buffer> {
  const documentElement = React.createElement(ServerPdfDocument, { plan });
  return await renderToBuffer(
    documentElement as unknown as React.ReactElement<DocumentProps>
  );
}
