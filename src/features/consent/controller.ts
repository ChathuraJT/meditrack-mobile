import {
  makeRecord,
  parseJournal,
  requiredCurrent,
  trackingAllowed,
  researchAllowed,
  type Choices,
  type ConsentDocuments,
  type ConsentJournal,
  type ConsentRecord,
} from './model';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
type State = {
  ready: boolean;
  saving: boolean;
  error: string | null;
  record: ConsentRecord | null;
  trackingBlocked: boolean;
  researchBlocked: boolean;
};

export class ConsentController {
  private state: State = {
    ready: false,
    saving: false,
    error: null,
    record: null,
    trackingBlocked: false,
    researchBlocked: false,
  };
  private journal: ConsentJournal;
  private alive = true;
  private listeners = new Set<() => void>();
  private key: string;
  constructor(
    private storage: Storage,
    readonly scope: string,
    readonly accountId: number | null,
    readonly documents: ConsentDocuments,
    private now = () => new Date().toISOString(),
  ) {
    this.key = `meditrack.consent.v1.${encodeURIComponent(scope)}`;
    this.journal = parseJournal(null, scope);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<State>) {
    if (!this.alive) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  requiredAccepted = () =>
    this.alive &&
    this.state.ready &&
    requiredCurrent(this.state.record, this.documents);
  canTrack = () =>
    this.accountId !== null &&
    this.requiredAccepted() &&
    !this.state.trackingBlocked &&
    trackingAllowed(this.state.record, this.documents);
  canResearch = () =>
    this.accountId !== null &&
    this.requiredAccepted() &&
    !this.state.researchBlocked &&
    researchAllowed(this.state.record, this.documents);
  async initialize() {
    if (this.state.saving) return;
    this.update({ ready: false, error: null });
    try {
      const journal = parseJournal(
        await this.storage.getItem(this.key),
        this.scope,
      );
      if (!this.alive) return;
      this.journal = journal;
      this.update({ ready: true, record: journal.events.at(-1) ?? null });
    } catch {
      this.update({
        error: 'Saved choices could not be loaded. Please retry.',
        ready: false,
      });
    }
  }
  async save(choices: Choices) {
    if (!this.alive || !this.state.ready || this.state.saving)
      throw new Error('Consent is not ready to save.');
    const record = makeRecord(
      this.state.record,
      choices,
      this.documents,
      this.now(),
    );
    await this.persist(record);
  }
  async withdraw(kind: 'tracking' | 'research') {
    if (
      !this.alive ||
      !this.state.ready ||
      this.state.saving ||
      !this.state.record
    )
      throw new Error('Consent is not ready to save.');
    const at = this.now();
    const previous = this.state.record;
    // Withdrawal never accepts a new document or requires a current version.
    await this.persist({
      ...previous,
      recordedAt: at,
      [kind]: {
        ...previous[kind],
        granted: false,
        updatedAt: at,
        withdrawnAt: at,
      },
    });
  }
  private async persist(record: ConsentRecord) {
    // Revocation takes effect before storage/network operations. Failed writes
    // keep optional work blocked until a successful save.
    this.update({
      saving: true,
      error: null,
      trackingBlocked: this.state.trackingBlocked || !record.tracking.granted,
      researchBlocked: this.state.researchBlocked || !record.research.granted,
    });
    try {
      const journal = {
        ...this.journal,
        events: [...this.journal.events, record],
      };
      await this.storage.setItem(this.key, JSON.stringify(journal));
      if (!this.alive) return;
      this.journal = journal;
      this.update({
        record,
        saving: false,
        trackingBlocked: false,
        researchBlocked: false,
      });
    } catch {
      this.update({
        saving: false,
        trackingBlocked: true,
        researchBlocked: true,
        error:
          'Choices could not be saved. Optional collection is paused on this device. Please retry.',
      });
      throw new Error('Choices could not be saved. Please retry.');
    }
  }
  dispose() {
    this.alive = false;
    this.listeners.clear();
  }
}
