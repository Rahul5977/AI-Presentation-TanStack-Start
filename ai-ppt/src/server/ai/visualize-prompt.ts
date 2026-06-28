export type SlideVisualInput = {
  kind: 'auto' | 'chart' | 'table' | 'timeline' | 'metrics'
  slide: { title: string; intent: string; bullets: string[] }
  language?: string
}

export const VISUALIZE_SYSTEM_INSTRUCTION = `You convert one presentation slide into a single structured data visual.
Return strict JSON only — no markdown, no prose.

Choose the best "kind" when asked for "auto", otherwise use the requested kind.
The JSON shape depends on kind:

- chart: { "kind":"chart", "chartType":"bar"|"line"|"pie", "title": string,
    "categories": string[], "series": [{ "name": string, "values": number[] }] }
    (each series.values length MUST equal categories length; numbers only)
- table: { "kind":"table", "title": string, "columns": string[], "rows": string[][] }
    (each row length MUST equal columns length)
- timeline: { "kind":"timeline", "title": string,
    "events": [{ "label": string, "title": string, "description": string }] }
- metrics: { "kind":"metrics", "title": string,
    "items": [{ "value": string, "label": string, "caption": string }] }

Invent reasonable, realistic illustrative numbers when the slide lacks explicit data.
Keep it concise: charts <= 6 categories, tables <= 6 columns / 8 rows, timeline <= 6 events, metrics <= 4 items.`
