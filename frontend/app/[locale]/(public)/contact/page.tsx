import type { Metadata } from "next";
import { ContactSplit } from "@/src/components/marketing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "fr"
        ? "Contact | Wedemboyz Lavomatique"
        : "Contact | Wedemboyz Lavomatique",
    description:
      locale === "fr"
        ? "Contactez l'équipe Wedemboyz Lavomatique à Yaoundé."
        : "Contact the Wedemboyz Lavomatique team in Yaoundé.",
  };
}

export default function ContactPage() {
  return (
    <>
      <ContactSplit />
    </>
  );
}
