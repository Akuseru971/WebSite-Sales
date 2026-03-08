import type { EnrichedCommerceLead } from "./enrichment";
import type { DemoSiteContent } from "@/lib/demo-sites/types";

export interface OutreachEmailDraft {
  language: string;
  subject: string;
  body: string;
}

export function buildOutreachEmailDraft(params: {
  enriched: EnrichedCommerceLead;
  generatedContent: DemoSiteContent;
}): OutreachEmailDraft {
  const { enriched, generatedContent } = params;
  const name = enriched.lead.businessName;
  const city = enriched.lead.city;
  const heroTitle = generatedContent.sections.find((section) => section.type === "hero")?.content.title;
  const previewLine = `Preview generated for ${name} (${city})`;

  switch (enriched.locale.language) {
    case "fr":
      return {
        language: "fr",
        subject: `Maquette de site prete pour ${name}`,
        body: [
          `Bonjour,`,
          ``,
          `Nous avons prepare une maquette de site adaptee a ${name}, avec un contenu localise pour ${city}.`,
          heroTitle ? `Angle principal propose: ${heroTitle}.` : "",
          ``,
          `Ce que vous trouverez dans la proposition :`,
          `- Positionnement et message principal optimises`,
          `- Sections services/offres adaptees a votre activite`,
          `- Contact et conversion orientes prise de rendez-vous`,
          ``,
          `${previewLine}.`,
          ``,
          `Souhaitez-vous que nous appliquions une version plus premium, plus moderne, ou orientee conversion rapide ?`,
          ``,
          `Cordialement`
        ].join("\n")
      };
    case "es":
      return {
        language: "es",
        subject: `Propuesta de web lista para ${name}`,
        body: [
          `Hola,`,
          ``,
          `Hemos preparado una propuesta de web para ${name}, adaptada al mercado local de ${city}.`,
          heroTitle ? `Enfoque principal propuesto: ${heroTitle}.` : "",
          ``,
          `${previewLine}.`,
          ``,
          `Si quieres, te enviamos una version mas premium o una version enfocada en conversion.`,
          ``,
          `Un saludo`
        ].join("\n")
      };
    case "de":
      return {
        language: "de",
        subject: `Website-Entwurf fur ${name} ist bereit`,
        body: [
          `Hallo,`,
          ``,
          `wir haben einen Website-Entwurf fur ${name} erstellt, lokal angepasst fur ${city}.`,
          heroTitle ? `Vorgeschlagener Hauptwinkel: ${heroTitle}.` : "",
          ``,
          `${previewLine}.`,
          ``,
          `Gerne senden wir Ihnen auch eine Premium-Variante oder eine Conversion-Variante.`,
          ``,
          `Viele Grusse`
        ].join("\n")
      };
    case "it":
      return {
        language: "it",
        subject: `Bozza sito pronta per ${name}`,
        body: [
          `Ciao,`,
          ``,
          `abbiamo preparato una bozza sito per ${name}, pensata per il contesto locale di ${city}.`,
          heroTitle ? `Angolo principale proposto: ${heroTitle}.` : "",
          ``,
          `${previewLine}.`,
          ``,
          `Se vuoi, possiamo inviarti anche una versione premium o una versione piu orientata alla conversione.`,
          ``,
          `Grazie`
        ].join("\n")
      };
    case "pt":
      return {
        language: "pt",
        subject: `Proposta de site pronta para ${name}`,
        body: [
          `Ola,`,
          ``,
          `preparamos uma proposta de site para ${name}, adaptada ao contexto local de ${city}.`,
          heroTitle ? `Enfoque principal sugerido: ${heroTitle}.` : "",
          ``,
          `${previewLine}.`,
          ``,
          `Se quiser, enviamos tambem uma versao premium ou uma versao focada em conversao.`,
          ``,
          `Obrigado`
        ].join("\n")
      };
    case "nl":
      return {
        language: "nl",
        subject: `Websitevoorstel klaar voor ${name}`,
        body: [
          `Hallo,`,
          ``,
          `we hebben een websitevoorstel gemaakt voor ${name}, lokaal afgestemd op ${city}.`,
          heroTitle ? `Voorgestelde hoofdboodschap: ${heroTitle}.` : "",
          ``,
          `${previewLine}.`,
          ``,
          `Als je wilt, maken we ook een premium variant of een extra conversiegerichte variant.`,
          ``,
          `Met vriendelijke groet`
        ].join("\n")
      };
    case "en":
    default:
      return {
        language: "en",
        subject: `Website draft ready for ${name}`,
        body: [
          `Hello,`,
          ``,
          `We prepared a website draft for ${name}, localized for ${city}.`,
          heroTitle ? `Proposed core angle: ${heroTitle}.` : "",
          ``,
          `The proposal includes:`,
          `- Localized headline and positioning`,
          `- Service/offering structure aligned to your business`,
          `- Conversion-focused contact sections`,
          ``,
          `${previewLine}.`,
          ``,
          `Would you like a premium style variant or a high-conversion variant next?`,
          ``,
          `Best regards`
        ].join("\n")
      };
  }
}
