const MAX_TRANSLATION_EVENTS = 200;
const DEFAULT_TRANSLATION_EVENT_LIMIT = 50;

type TranslationEvent = Record<string, unknown>;

function ensureEventsBuffer(): TranslationEvent[] {
  const globalState = globalThis as typeof globalThis & { __translatorEvents?: TranslationEvent[] };
  if (!globalState.__translatorEvents) globalState.__translatorEvents = [];
  return globalState.__translatorEvents;
}

export function logTranslationEvent(event: TranslationEvent): void {
  if (!event || typeof event !== "object") return;
  const events = ensureEventsBuffer();
  events.unshift({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString(), ...event });
  if (events.length > MAX_TRANSLATION_EVENTS) events.length = MAX_TRANSLATION_EVENTS;
}

export function getTranslationEvents(limit = DEFAULT_TRANSLATION_EVENT_LIMIT): { events: TranslationEvent[]; total: number } {
  const numericLimit = Number(limit);
  const boundedLimit = Number.isFinite(numericLimit) && numericLimit > 0
    ? Math.min(Math.floor(numericLimit), MAX_TRANSLATION_EVENTS)
    : DEFAULT_TRANSLATION_EVENT_LIMIT;
  const events = ensureEventsBuffer();
  return { events: events.slice(0, boundedLimit), total: events.length };
}
