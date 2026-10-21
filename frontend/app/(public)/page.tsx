import {
  AtelierCta,
  AtelierHero,
  AtelierMarquee,
  AtelierProcess,
  AtelierServices,
  AtelierTrust,
  AtelierValue,
} from "@/src/components/marketing-v3";

export const viewport = { themeColor: "#071130", colorScheme: "dark" };

export default function HomePage() {
  return (
    <div className="atelier">
      <style>{"html,body{background:#071130}"}</style>
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
