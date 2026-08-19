import {
  AtelierCta,
  AtelierHero,
  AtelierMarquee,
  AtelierProcess,
  AtelierServices,
  AtelierTrust,
  AtelierValue,
} from "@/components/marketing-v3";

export default function HomePage() {
  return (
    <div className="atelier">
      <AtelierHero />
      <AtelierMarquee />
      <AtelierProcess />
      <AtelierServices />
      <AtelierValue />
      <AtelierTrust />
      <AtelierCta />
    </div>
  );
}
