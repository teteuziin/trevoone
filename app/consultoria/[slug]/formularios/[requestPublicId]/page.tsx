import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string; requestPublicId: string }>;
}

export default async function SingleFormularioPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/consultoria/${slug}/formularios`);
}
