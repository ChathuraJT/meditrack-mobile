export type Document = { version: string; text?: string; url?: string };
export type ConsentDocuments = {
  terms: { version: string; text: string };
  privacy: Document | null;
  research: (Document & { retentionPeriod: string; recipients: string }) | null;
};
export type Choices = {
  required: boolean;
  tracking: boolean;
  research: boolean;
};
export type Decision = {
  granted: boolean;
  documentVersion: string;
  updatedAt: string;
  withdrawnAt: string | null;
};
export type ConsentRecord = {
  recordedAt: string;
  terms: { version: string; acceptedAt: string };
  privacy: { version: string; acknowledgedAt: string } | null;
  tracking: Decision;
  research: Decision & {
    informationVersion: string | null;
    retentionPeriod: string | null;
  };
};
export type ConsentJournal = {
  schema: 1;
  scope: string;
  serverPersistence: 'not_implemented';
  events: ConsentRecord[];
};

export function consentScope(baseUrl: string, userId: number | null) {
  return JSON.stringify([baseUrl.trim().replace(/\/+$/, ''), userId]);
}
export function documentAvailable(doc: Document | null) {
  return (
    !!doc?.version.trim() &&
    (!!doc.text?.trim() || (!!doc.url && /^https:\/\/[^\s]+$/.test(doc.url)))
  );
}
export function researchAvailable(docs: ConsentDocuments) {
  return (
    documentAvailable(docs.privacy) &&
    documentAvailable(docs.research) &&
    !!docs.research?.retentionPeriod.trim() &&
    !!docs.research?.recipients.trim()
  );
}
export function requiredCurrent(
  record: ConsentRecord | null,
  docs: ConsentDocuments,
) {
  return (
    !!record &&
    record.terms.version === docs.terms.version &&
    (docs.privacy === null
      ? record.privacy === null
      : documentAvailable(docs.privacy) &&
        record.privacy?.version === docs.privacy.version)
  );
}
export function trackingAllowed(
  record: ConsentRecord | null,
  docs: ConsentDocuments,
) {
  return (
    requiredCurrent(record, docs) &&
    documentAvailable(docs.privacy) &&
    record?.tracking.granted === true &&
    record.tracking.documentVersion === docs.terms.version
  );
}
export function researchAllowed(
  record: ConsentRecord | null,
  docs: ConsentDocuments,
) {
  return (
    requiredCurrent(record, docs) &&
    researchAvailable(docs) &&
    record?.research.granted === true &&
    record.research.documentVersion === docs.terms.version &&
    record.research.informationVersion === docs.research?.version &&
    record.research.retentionPeriod === docs.research?.retentionPeriod
  );
}

export function makeRecord(
  previous: ConsentRecord | null,
  choices: Choices,
  docs: ConsentDocuments,
  at: string,
): ConsentRecord {
  if (!choices.required) throw new Error('Accept the Terms before continuing.');
  if (!docs.terms.version.trim() || !docs.terms.text.trim())
    throw new Error('The Terms document is unavailable.');
  if (docs.privacy !== null && !documentAvailable(docs.privacy))
    throw new Error('The Privacy Notice is unavailable.');
  if (choices.tracking && !documentAvailable(docs.privacy))
    throw new Error(
      'Tracking consent is unavailable until the Privacy Notice is provided.',
    );
  if (choices.research && !researchAvailable(docs))
    throw new Error(
      'Research information and retention must be configured first.',
    );
  const current = requiredCurrent(previous, docs);
  const decision = (granted: boolean, old: Decision | undefined): Decision => ({
    granted,
    documentVersion: docs.terms.version,
    updatedAt: at,
    withdrawnAt: granted
      ? null
      : old?.granted
        ? at
        : (old?.withdrawnAt ?? null),
  });
  return {
    recordedAt: at,
    terms: {
      version: docs.terms.version,
      acceptedAt: current ? previous!.terms.acceptedAt : at,
    },
    privacy: docs.privacy
      ? {
          version: docs.privacy.version,
          acknowledgedAt: current ? previous!.privacy!.acknowledgedAt : at,
        }
      : null,
    tracking: decision(choices.tracking, previous?.tracking),
    research: {
      ...decision(choices.research, previous?.research),
      informationVersion: docs.research?.version ?? null,
      retentionPeriod: docs.research?.retentionPeriod ?? null,
    },
  };
}

// Malformed persisted consent must never authorize collection.
export function parseJournal(
  raw: string | null,
  scope: string,
): ConsentJournal {
  if (raw === null)
    return {
      schema: 1,
      scope,
      serverPersistence: 'not_implemented',
      events: [],
    };
  const value = JSON.parse(raw);
  const date = (v: unknown) =>
    typeof v === 'string' && Number.isFinite(Date.parse(v));
  const decision = (v: Decision) =>
    v &&
    typeof v.granted === 'boolean' &&
    typeof v.documentVersion === 'string' &&
    date(v.updatedAt) &&
    (v.withdrawnAt === null || date(v.withdrawnAt));
  if (
    value?.schema !== 1 ||
    value.scope !== scope ||
    value.serverPersistence !== 'not_implemented' ||
    !Array.isArray(value.events) ||
    value.events.some(
      (r: ConsentRecord) =>
        !r ||
        !date(r.recordedAt) ||
        typeof r.terms?.version !== 'string' ||
        !date(r.terms?.acceptedAt) ||
        !(
          r.privacy === null ||
          (typeof r.privacy?.version === 'string' &&
            date(r.privacy?.acknowledgedAt))
        ) ||
        !decision(r.tracking) ||
        !decision(r.research) ||
        !(
          r.research.informationVersion === null ||
          typeof r.research.informationVersion === 'string'
        ) ||
        !(
          r.research.retentionPeriod === null ||
          typeof r.research.retentionPeriod === 'string'
        ),
    )
  )
    throw new Error(
      'Saved consent could not be read. Retry before continuing.',
    );
  return value;
}
