import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import CareCard from '@/components/ui/CareCard';
import { careCardAccents } from '@/theme/careCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing } from '@/theme/tokens';
import {
  DEMO_TIMEZONE,
  doseDateTime,
  doseStatus,
  dateKey,
  formatDate,
  formatDateTime,
  isDoseDue,
  todayKey,
  type DemoScenario,
  type DemoState,
  type DoseOccurrence,
  type DoseRecord,
  type Medication,
} from '@/features/care/demoData';
import {
  loadDemoState,
  resetDemoState,
  saveDemoState,
} from '@/features/care/demoService';

function getDemoScenario(): DemoScenario {
  return 'approved';
}

function StatusPill({
  status,
  overdue,
}: {
  status: ReturnType<typeof doseStatus>;
  overdue?: boolean;
}) {
  const label =
    status === 'not-recorded' && overdue
      ? 'Not recorded · overdue'
      : status.replace('-', ' ');
  return (
    <View
      style={[
        styles.statusPill,
        status === 'taken' && styles.takenPill,
        status === 'skipped' && styles.skippedPill,
        overdue && styles.overduePill,
      ]}
    >
      <AppText variant="caption" style={styles.statusText}>
        {label}
      </AppText>
    </View>
  );
}

function DoseCard({
  dose,
  medication,
  record,
  onTake,
  onSkip,
  onDetails,
  onUndo,
}: {
  dose: DoseOccurrence;
  medication: Medication;
  record?: DoseRecord;
  onTake: () => void;
  onSkip: () => void;
  onDetails: () => void;
  onUndo: () => void;
}) {
  const status = doseStatus(dose, record ? [record] : []);
  const overdue = status === 'not-recorded' && isDoseDue(dose);
  return (
    <CareCard
      tone="amber"
      style={[styles.doseCard, overdue && styles.overdueCard]}
    >
      <View style={styles.doseTop}>
        <View style={styles.doseIcon}>
          <Ionicons
            name="medical-outline"
            size={20}
            color={careCardAccents.amber}
          />
        </View>
        <View style={styles.flex}>
          <AppText style={styles.medicationName}>{medication.label}</AppText>
          <AppText variant="caption" muted>
            {medication.instruction} · {formatDateTime(doseDateTime(dose))}
          </AppText>
        </View>
        <StatusPill status={status} overdue={overdue} />
      </View>
      <AppText variant="caption" muted>
        {medication.foodInstruction}
      </AppText>
      {record?.intakeTime && (
        <AppText variant="caption" style={styles.recorded}>
          Reported intake: {formatDateTime(record.intakeTime)}
        </AppText>
      )}
      {record?.reason && (
        <AppText variant="caption" style={styles.recorded}>
          Reason: {record.reason}
        </AppText>
      )}
      <View style={styles.actionRow}>
        {status === 'upcoming' || status === 'not-recorded' ? (
          <>
            <AppButton
              label="Mark as taken"
              onPress={onTake}
              style={styles.actionButton}
            />
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              style={styles.secondaryAction}
            >
              <AppText variant="caption" style={styles.secondaryActionText}>
                Skip
              </AppText>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={onUndo}
            accessibilityRole="button"
            style={styles.secondaryAction}
          >
            <AppText variant="caption" style={styles.secondaryActionText}>
              Undo / correct record
            </AppText>
          </Pressable>
        )}
        <Pressable
          onPress={onDetails}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${medication.label}`}
        >
          <AppText variant="caption" style={styles.detailsText}>
            Details
          </AppText>
        </Pressable>
      </View>
    </CareCard>
  );
}

export function MedicationsScreen() {
  const scenario = getDemoScenario();
  const [state, setState] = useState<DemoState | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [dialog, setDialog] = useState<{
    type: 'take' | 'skip' | 'details';
    dose?: DoseOccurrence;
    medication?: Medication;
  } | null>(null);
  const [intakeTime, setIntakeTime] = useState(new Date().toISOString());
  const [intakeTimeText, setIntakeTimeText] = useState('');
  const [skipReason, setSkipReason] = useState('Forgot');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    if (scenario === 'error') {
      setLoading(false);
      setError(true);
      return;
    }
    const next = await loadDemoState(scenario);
    setState(next);
    setLoading(false);
  }, [scenario]);
  // Loading is an external-storage synchronization, not derived render state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const updateState = async (next: DemoState) => {
    setState(next);
    await saveDemoState(next);
  };
  const medicationMap = useMemo(
    () =>
      new Map(
        state?.prescription?.medications.map((item) => [item.id, item]) ?? [],
      ),
    [state],
  );
  const selectedDoses =
    state?.doses.filter((dose) => dose.date === selectedDate) ?? [];
  const nonPrnDoses =
    state?.doses.filter(
      (dose) => !medicationMap.get(dose.medicationId)?.asNeeded,
    ) ?? [];
  const dueDoses = nonPrnDoses.filter((dose) => isDoseDue(dose));
  const takenDue = dueDoses.filter((dose) =>
    state?.records.some(
      (record) => record.doseId === dose.id && record.status === 'taken',
    ),
  ).length;
  const adherence = dueDoses.length
    ? Math.round((takenDue / dueDoses.length) * 100)
    : null;
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index - 2);
    return dateKey(date);
  });

  const recordFor = (dose: DoseOccurrence) =>
    state?.records.find((record) => record.doseId === dose.id);
  const recordTaken = async () => {
    if (!state || !dialog?.dose) return;
    if (state.records.some((record) => record.doseId === dialog.dose?.id))
      return setDialog(null);
    const parsedIntakeTime =
      new Date(intakeTimeText).toString() === 'Invalid Date'
        ? intakeTime
        : new Date(intakeTimeText).toISOString();
    const next: DemoState = {
      ...state,
      records: [
        ...state.records,
        {
          doseId: dialog.dose.id,
          status: 'taken',
          recordedAt: new Date().toISOString(),
          intakeTime: parsedIntakeTime,
        },
      ],
    };
    await updateState(next);
    setDialog(null);
  };
  const recordSkipped = async () => {
    if (
      !state ||
      !dialog?.dose ||
      state.records.some((record) => record.doseId === dialog.dose?.id)
    )
      return setDialog(null);
    await updateState({
      ...state,
      records: [
        ...state.records,
        {
          doseId: dialog.dose.id,
          status: 'skipped',
          recordedAt: new Date().toISOString(),
          reason: skipReason,
        },
      ],
    });
    setDialog(null);
  };
  const undo = async (dose: DoseOccurrence) => {
    if (!state) return;
    await updateState({
      ...state,
      records: state.records.filter((record) => record.doseId !== dose.id),
    });
  };

  const statusContent = (title: string, message: string) => (
    <CareCard tone="amber">
      <AppText variant="heading">{title}</AppText>
      <AppText muted>{message}</AppText>
    </CareCard>
  );
  if (loading)
    return (
      <Screen withPattern>
        <ActivityIndicator
          color={careCardAccents.amber}
          accessibilityLabel="Loading medication plan"
        />
      </Screen>
    );
  if (error)
    return (
      <Screen withPattern>
        {statusContent(
          'Could not load demo plan',
          'This is a simulated fetch error. Your demo records were not changed.',
        )}
        <AppButton label="Retry" onPress={() => void load()} />
      </Screen>
    );

  return (
    <Screen withPattern>
      <View style={styles.demoBanner}>
        <Ionicons
          name="flask-outline"
          size={18}
          color={careCardAccents.amber}
        />
        <AppText variant="caption" style={styles.demoText}>
          Demo data · illustrative only · timezone {DEMO_TIMEZONE}
        </AppText>
      </View>
      {scenario === 'offline' && (
        <View style={styles.infoBanner}>
          <AppText variant="caption">
            Offline demo data · changes are saved locally on this device.
          </AppText>
        </View>
      )}
      {state?.pendingPrescription &&
        state.prescription &&
        scenario === 'update-pending' && (
          <View style={styles.warningBanner}>
            <AppText variant="caption" style={styles.warningText}>
              A newer plan version is awaiting doctor review. Showing approved
              version {state.prescription.version}.
            </AppText>
          </View>
        )}
      {!state?.prescription ? (
        statusContent(
          scenario === 'changes-requested'
            ? 'Changes requested'
            : 'No active approved plan',
          scenario === 'pending'
            ? 'Your prescription is waiting for doctor approval. Pending content is not shown as active.'
            : 'There is no approved prescription to display right now.',
        )
      ) : (
        <>
          <CareCard tone="amber">
            <View style={styles.cardHeading}>
              <View style={styles.flex}>
                <AppText variant="heading">Active prescription</AppText>
                <AppText muted>{state.prescription.instructions}</AppText>
              </View>
              <View style={styles.approvedBadge}>
                <AppText variant="caption" style={styles.approvedText}>
                  Approved
                </AppText>
              </View>
            </View>
            <View style={styles.metaGrid}>
              <AppText variant="caption">
                Reference{'\n'}
                <AppText style={styles.metaValue}>
                  {state.prescription.reference}
                </AppText>
              </AppText>
              <AppText variant="caption">
                Doctor{'\n'}
                <AppText style={styles.metaValue}>
                  {state.prescription.doctorName}
                </AppText>
              </AppText>
              <AppText variant="caption">
                Approved{'\n'}
                <AppText style={styles.metaValue}>
                  {formatDate(state.prescription.approvalDate)}
                </AppText>
              </AppText>
              <AppText variant="caption">
                Plan version{'\n'}
                <AppText style={styles.metaValue}>
                  {state.prescription.version}
                </AppText>
              </AppText>
            </View>
          </CareCard>
          <View style={styles.dateSelector}>
            {days.map((date) => (
              <Pressable
                key={date}
                onPress={() => setSelectedDate(date)}
                accessibilityRole="button"
                accessibilityLabel={`Show doses for ${formatDate(date)}`}
                style={[
                  styles.dateItem,
                  date === selectedDate && styles.dateItemActive,
                ]}
              >
                <AppText
                  variant="caption"
                  style={
                    date === selectedDate ? styles.dateTextActive : undefined
                  }
                >
                  {formatDate(date, { weekday: 'short' })}
                </AppText>
                <AppText
                  style={
                    date === selectedDate
                      ? styles.dateTextActive
                      : styles.dateNumber
                  }
                >
                  {new Date(`${date}T12:00:00`).getDate()}
                </AppText>
              </Pressable>
            ))}
          </View>
          <CareCard tone="purple">
            <AppText variant="heading">Daily summary</AppText>
            <View style={styles.summaryRow}>
              <Summary
                label="Taken"
                value={
                  selectedDoses.filter(
                    (dose) => recordFor(dose)?.status === 'taken',
                  ).length
                }
                color={colors.success}
              />
              <Summary
                label="Skipped"
                value={
                  selectedDoses.filter(
                    (dose) => recordFor(dose)?.status === 'skipped',
                  ).length
                }
                color={colors.warning}
              />
              <Summary
                label="Not recorded"
                value={
                  selectedDoses.filter(
                    (dose) =>
                      doseStatus(dose, state.records) === 'not-recorded',
                  ).length
                }
                color={colors.error}
              />
              <Summary
                label="Upcoming"
                value={
                  selectedDoses.filter(
                    (dose) => doseStatus(dose, state.records) === 'upcoming',
                  ).length
                }
                color={careCardAccents.amber}
              />
            </View>
            <AppText variant="caption" muted>
              Adherence: reported taken doses ÷ scheduled non-PRN doses due so
              far.
            </AppText>
            <View style={styles.progressTrack}>
              {adherence !== null && (
                <View
                  style={[styles.progressFill, { width: `${adherence}%` }]}
                />
              )}
            </View>
            <AppText variant="caption" style={styles.progressLabel}>
              {adherence === null
                ? 'No doses due yet'
                : `${adherence}% · Based on your reported records (${takenDue}/${dueDoses.length})`}
            </AppText>
          </CareCard>
          {(['Morning', 'Afternoon', 'Evening'] as const).map((slot) => {
            const slotDoses = selectedDoses.filter(
              (dose) => dose.timeSlot === slot,
            );
            return (
              <View key={slot}>
                <AppText variant="heading" style={styles.slotHeading}>
                  {slot}
                </AppText>
                {slotDoses.length ? (
                  slotDoses.map((dose) => {
                    const medication = medicationMap.get(dose.medicationId);
                    if (!medication) return null;
                    return (
                      <DoseCard
                        key={dose.id}
                        dose={dose}
                        medication={medication}
                        record={recordFor(dose)}
                        onTake={() => {
                          const now = new Date();
                          setIntakeTime(now.toISOString());
                          setIntakeTimeText(
                            now.toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }),
                          );
                          setDialog({ type: 'take', dose, medication });
                        }}
                        onSkip={() =>
                          setDialog({ type: 'skip', dose, medication })
                        }
                        onUndo={() => void undo(dose)}
                        onDetails={() =>
                          setDialog({ type: 'details', dose, medication })
                        }
                      />
                    );
                  })
                ) : (
                  <CareCard tone="amber">
                    <AppText muted>
                      No medication scheduled for {slot.toLowerCase()} on this
                      day.
                    </AppText>
                  </CareCard>
                )}
              </View>
            );
          })}
          <AppText variant="heading" style={styles.slotHeading}>
            As-needed medication
          </AppText>
          {state.prescription.medications
            .filter((medication) => medication.asNeeded)
            .map((medication) => (
              <CareCard tone="amber" key={medication.id}>
                <AppText style={styles.medicationName}>
                  {medication.label}
                </AppText>
                <AppText variant="caption" muted>
                  {medication.instruction}. Optional use logging can be added
                  later; it is not included in adherence.
                </AppText>
                <Pressable
                  onPress={() => setDialog({ type: 'details', medication })}
                >
                  <AppText variant="caption" style={styles.detailsText}>
                    View prescription details
                  </AppText>
                </Pressable>
              </CareCard>
            ))}
          {__DEV__ && (
            <Pressable
              onPress={() => void resetDemoState(scenario).then(setState)}
              accessibilityRole="button"
              style={styles.reset}
            >
              <AppText variant="caption" style={styles.detailsText}>
                Reset demo data
              </AppText>
            </Pressable>
          )}
        </>
      )}
      <Modal
        visible={!!dialog}
        transparent
        animationType="slide"
        onRequestClose={() => setDialog(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            {dialog?.type === 'details' && dialog.medication ? (
              <>
                <AppText variant="heading">{dialog.medication.label}</AppText>
                <AppText muted>{dialog.medication.instruction}</AppText>
                <AppText variant="caption">
                  Schedule: {dialog.medication.schedule} ·{' '}
                  {dialog.medication.times.join(', ') || 'as needed'}
                </AppText>
                <AppText variant="caption">
                  Dates: {formatDate(dialog.medication.startDate)} –{' '}
                  {formatDate(dialog.medication.endDate)}
                </AppText>
                <AppText variant="caption">
                  Doctor instructions: {dialog.medication.doctorInstructions}
                </AppText>
                {state?.records
                  .filter((record) => dialog.dose?.id === record.doseId)
                  .map((record) => (
                    <AppText key={record.doseId} variant="caption">
                      Recent record: {record.status} at{' '}
                      {formatDateTime(record.recordedAt)}
                    </AppText>
                  ))}
                <AppButton label="Close" onPress={() => setDialog(null)} />{' '}
              </>
            ) : dialog?.type === 'take' ? (
              <>
                <AppText variant="heading">Record dose</AppText>
                <AppText muted>
                  {dialog.medication?.label} · scheduled{' '}
                  {dialog.dose && formatDateTime(doseDateTime(dialog.dose))}
                </AppText>
                <AppText variant="caption">
                  Actual intake time (for example, Oct 18, 8:15 AM)
                </AppText>
                <TextInput
                  value={intakeTimeText}
                  onChangeText={setIntakeTimeText}
                  style={styles.input}
                />
                <AppButton
                  label="Confirm taken"
                  onPress={() => void recordTaken()}
                />
                <Pressable onPress={() => setDialog(null)}>
                  <AppText style={styles.cancel}>Cancel</AppText>
                </Pressable>
              </>
            ) : (
              <>
                <AppText variant="heading">Skip dose</AppText>
                <AppText muted>
                  {dialog?.medication?.label} · scheduled{' '}
                  {dialog?.dose && formatDateTime(doseDateTime(dialog.dose))}
                </AppText>
                <AppText variant="caption">Optional reason</AppText>
                <View style={styles.reasonWrap}>
                  {['Forgot', 'Not available', 'Side effects', 'Other'].map(
                    (reason) => (
                      <Pressable
                        key={reason}
                        onPress={() => setSkipReason(reason)}
                        style={[
                          styles.reasonChip,
                          skipReason === reason && styles.reasonActive,
                        ]}
                      >
                        <AppText variant="caption">{reason}</AppText>
                      </Pressable>
                    ),
                  )}
                </View>
                <AppButton
                  label="Confirm skipped"
                  onPress={() => void recordSkipped()}
                />
                <Pressable onPress={() => setDialog(null)}>
                  <AppText style={styles.cancel}>Cancel</AppText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Summary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <AppText variant="heading" style={{ color }}>
        {value}
      </AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F4FB',
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  demoText: { color: colors.primary },
  debugCard: { padding: spacing.sm },
  debugLabel: { fontWeight: '700', marginBottom: spacing.xs },
  scenarioWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  scenarioChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scenarioChipActive: {
    backgroundColor: '#D9F1F2',
    borderColor: colors.accent,
  },
  scenarioTextActive: { color: colors.primary, fontWeight: '700' },
  infoBanner: {
    padding: spacing.sm,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.sm,
  },
  warningBanner: {
    padding: spacing.sm,
    backgroundColor: '#FFF7DE',
    borderRadius: radius.sm,
  },
  warningText: { color: '#8A5A00' },
  cardHeading: { flexDirection: 'row', gap: spacing.sm },
  approvedBadge: {
    backgroundColor: '#DDF7EE',
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    height: 28,
  },
  approvedText: { color: '#087A5B', fontWeight: '700' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaValue: { fontWeight: '700' },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dateItem: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 52,
  },
  dateItemActive: { backgroundColor: colors.primary },
  dateTextActive: { color: '#FFFFFF', fontWeight: '700' },
  dateNumber: { fontSize: 18, fontWeight: '700', color: colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center' },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: careCardAccents.purple },
  progressLabel: { fontWeight: '600' },
  slotHeading: { marginTop: spacing.sm },
  doseCard: { marginBottom: spacing.sm },
  overdueCard: { borderColor: '#F3B6B0', borderWidth: 1 },
  doseTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicationName: { fontWeight: '700', fontSize: 16 },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: '#E8F4FB',
  },
  takenPill: { backgroundColor: '#DDF7EE' },
  skippedPill: { backgroundColor: '#FFF0D4' },
  overduePill: { backgroundColor: '#FDE4E1' },
  statusText: { textTransform: 'capitalize', fontWeight: '700' },
  recorded: { color: colors.secondary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: { flex: 1, minHeight: 42 },
  secondaryAction: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  secondaryActionText: { color: colors.error, fontWeight: '700' },
  detailsText: { color: colors.primary, fontWeight: '700' },
  reset: { alignItems: 'center', padding: spacing.md },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.text,
  },
  cancel: { color: colors.secondary, textAlign: 'center', padding: spacing.sm },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing.sm,
  },
  reasonActive: { backgroundColor: '#D9F1F2', borderColor: colors.accent },
});
