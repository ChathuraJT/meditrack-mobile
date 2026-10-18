export type DemoScenario =
  | 'approved'
  | 'pending'
  | 'update-pending'
  | 'changes-requested'
  | 'no-prescription'
  | 'loading'
  | 'error'
  | 'offline';

export type DoseStatus = 'upcoming' | 'taken' | 'skipped' | 'not-recorded';
export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';
export type CheckInFeeling = 'Better' | 'Same' | 'Worse';
export type ActivityLevel = 'Normal' | 'Some difficulty' | 'Significant difficulty';

export interface Medication {
  id: string;
  label: string;
  instruction: string;
  schedule: string;
  times: string[];
  foodInstruction: string;
  startDate: string;
  endDate: string;
  asNeeded?: boolean;
  doctorInstructions: string;
}

export interface DoseOccurrence {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  timeSlot: TimeSlot;
}

export interface DoseRecord {
  doseId: string;
  status: 'taken' | 'skipped';
  recordedAt: string;
  intakeTime?: string;
  reason?: string;
}

export interface Prescription {
  reference: string;
  doctorName: string;
  approvalDate: string;
  version: number;
  startDate: string;
  endDate: string;
  instructions: string;
  medications: Medication[];
}

export interface RecoveryCheckIn {
  id: string;
  date: string;
  savedAt: string;
  feeling: CheckInFeeling;
  severity: number;
  activity: ActivityLevel;
  sideEffects: string;
  notes: string;
  status: 'Awaiting review' | 'Reviewed';
}

export interface DemoState {
  scenario: DemoScenario;
  prescription: Prescription | null;
  pendingPrescription: Prescription | null;
  doses: DoseOccurrence[];
  records: DoseRecord[];
  checkIns: RecoveryCheckIn[];
}

export const DEMO_TIMEZONE = 'Asia/Colombo';

export function dateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEMO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isoAt(date: string, time: string) {
  return `${date}T${time}:00+05:30`;
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEMO_TIMEZONE,
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(`${date}T12:00:00+05:30`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEMO_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function todayKey() {
  return dateKey(new Date());
}

export function getFixture(scenario: DemoScenario = 'approved'): DemoState {
  const today = new Date();
  const todayDate = dateKey(today);
  const startDate = dateKey(addDays(today, -14));
  const endDate = dateKey(addDays(today, 45));
  const medicationA: Medication = {
    id: 'demo-med-a',
    label: 'Demo Medicine A',
    instruction: 'Take 1 illustrative tablet',
    schedule: 'Once daily',
    times: ['08:00'],
    foodInstruction: 'After breakfast with water',
    startDate,
    endDate,
    doctorInstructions: 'Illustrative instruction: take consistently and contact the clinic with questions.',
  };
  const medicationB: Medication = {
    id: 'demo-med-b',
    label: 'Demo Medicine B',
    instruction: 'Take 1 illustrative capsule',
    schedule: 'Once daily',
    times: ['18:30'],
    foodInstruction: 'With the evening meal',
    startDate,
    endDate,
    doctorInstructions: 'Illustrative instruction: follow the prescribed evening schedule.',
  };
  const asNeeded: Medication = {
    id: 'demo-med-prn',
    label: 'Demo Relief Option',
    instruction: 'Use 1 illustrative tablet when needed',
    schedule: 'As needed',
    times: [],
    foodInstruction: 'Follow the label instructions',
    startDate,
    endDate,
    asNeeded: true,
    doctorInstructions: 'Illustrative as-needed option. Log use only when you choose to use it.',
  };
  const prescription: Prescription = {
    reference: 'RX-DEMO-001',
    doctorName: 'Dr. Demo',
    approvalDate: dateKey(addDays(today, -3)),
    version: 1,
    startDate,
    endDate,
    instructions: 'Illustrative demo prescription. This is not a treatment recommendation.',
    medications: [medicationA, medicationB, asNeeded],
  };
  const pendingPrescription: Prescription = {
    ...prescription,
    reference: 'RX-DEMO-002',
    version: 2,
    approvalDate: todayDate,
    instructions: 'New illustrative version awaiting doctor review.',
  };
  const doses: DoseOccurrence[] = [];
  for (let offset = -2; offset <= 2; offset += 1) {
    const date = dateKey(addDays(today, offset));
    doses.push(
      { id: `demo-med-a-${date}`, medicationId: medicationA.id, date, time: '08:00', timeSlot: 'Morning' },
      { id: `demo-med-b-${date}`, medicationId: medicationB.id, date, time: '18:30', timeSlot: 'Evening' },
    );
  }
  const records: DoseRecord[] = [
    { doseId: `demo-med-a-${dateKey(addDays(today, -2))}`, status: 'taken', recordedAt: isoAt(dateKey(addDays(today, -2)), '08:12'), intakeTime: isoAt(dateKey(addDays(today, -2)), '08:12') },
    { doseId: `demo-med-b-${dateKey(addDays(today, -2))}`, status: 'skipped', recordedAt: isoAt(dateKey(addDays(today, -2)), '19:10'), reason: 'Forgot' },
    { doseId: `demo-med-a-${dateKey(addDays(today, -1))}`, status: 'taken', recordedAt: isoAt(dateKey(addDays(today, -1)), '08:05'), intakeTime: isoAt(dateKey(addDays(today, -1)), '08:05') },
  ];
  const checkIns: RecoveryCheckIn[] = Array.from({ length: 7 }, (_, index) => {
    const date = dateKey(addDays(today, index - 6));
    return {
      id: `check-in-${date}`,
      date,
      savedAt: isoAt(date, '20:00'),
      feeling: index < 2 ? 'Same' : 'Better',
      severity: [7, 7, 6, 5, 5, 4, 3][index],
      activity: index < 2 ? 'Some difficulty' : 'Normal',
      sideEffects: index === 1 ? 'Mild tiredness' : 'None reported',
      notes: index === 6 ? 'Feeling more comfortable today.' : '',
      status: index === 6 ? 'Awaiting review' : 'Reviewed',
    };
  });
  const base: DemoState = { scenario, prescription, pendingPrescription, doses, records, checkIns };
  if (scenario === 'pending' || scenario === 'changes-requested' || scenario === 'no-prescription') {
    base.prescription = null;
  }
  if (scenario === 'pending') base.pendingPrescription = prescription;
  if (scenario === 'changes-requested') base.pendingPrescription = { ...pendingPrescription, instructions: 'Doctor requested changes to this illustrative plan.' };
  if (scenario === 'no-prescription') base.pendingPrescription = null;
  if (scenario === 'update-pending') base.pendingPrescription = pendingPrescription;
  if (scenario === 'offline') base.scenario = 'offline';
  return base;
}

export function isDoseDue(dose: DoseOccurrence, now = new Date()) {
  return new Date(`${dose.date}T${dose.time}:00+05:30`) <= now;
}

export function doseStatus(dose: DoseOccurrence, records: DoseRecord[], now = new Date()): DoseStatus {
  const record = records.find((item) => item.doseId === dose.id);
  if (record) return record.status;
  return isDoseDue(dose, now) ? 'not-recorded' : 'upcoming';
}

export function doseDateTime(dose: DoseOccurrence) {
  return `${dose.date}T${dose.time}:00+05:30`;
}
