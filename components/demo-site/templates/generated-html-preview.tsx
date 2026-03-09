import type { GeneratedHtmlPreview } from "@/lib/demo-sites/types";

function buildSrcDocDocument(input: GeneratedHtmlPreview): string {
  const cssBlock = input.css
    ? `<style>${input.css}</style>`
    : "";

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "<meta charset=\"utf-8\" />",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    cssBlock,
    "</head>",
    `<body>${input.html}</body>`,
    "</html>",
  ].join("");
}

export function renderGeneratedHtmlPreview(input: GeneratedHtmlPreview) {
  return (
    <iframe
      title="Generated Source Redesign Preview"
      className="h-screen w-full border-0"
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={buildSrcDocDocument(input)}
    />
  );
}
