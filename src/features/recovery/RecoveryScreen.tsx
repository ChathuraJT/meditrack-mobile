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
import { radius, spacing, useThemeColors } from '@/theme/tokens';
import {
  dateKey,
  formatDate,
  type ActivityLevel,
  type CheckInFeeling,
  type DemoScenario,
  type DemoState,
  type RecoveryCheckIn,
} from '@/features/care/demoData';
import {
  loadDemoState,
  resetDemoState,
  saveDemoState,
} from '@/features/care/demoService';

function getDemoScenario(): DemoScenario {
  return 'approved';
}

export function RecoveryScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const scenario = getDemoScenario();
  const [state, setState] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecoveryCheckIn | null>(null);
  const [feeling, setFeeling] = useState<CheckInFeeling>('Better');
  const [severity, setSeverity] = useState(4);
  const [activity, setActivity] = useState<ActivityLevel>('Normal');
  const [sideEffects, setSideEffects] = useState('None reported');
  const [notes, setNotes] = useState('');
  const [followUpDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  });

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

  const openCheckIn = (existing?: RecoveryCheckIn) => {
    setEditing(existing ?? null);
    setFeeling(existing?.feeling ?? 'Better');
    setSeverity(existing?.severity ?? 4);
    setActivity(existing?.activity ?? 'Normal');
    setSideEffects(existing?.sideEffects ?? 'None reported');
    setNotes(existing?.notes ?? '');
    setFormOpen(true);
  };
  const saveCheckIn = async () => {
    if (!state) return;
    const now = new Date().toISOString();
    const today = dateKey(new Date());
    const nextCheckIn: RecoveryCheckIn = {
      id: editing?.id ?? `check-in-${today}`,
      date: today,
      savedAt: now,
      feeling,
      severity,
      activity,
      sideEffects,
      notes,
      status: 'Awaiting review',
    };
    const remaining = state.checkIns.filter(
      (item) => item.id !== nextCheckIn.id,
    );
    const next = {
      ...state,
      checkIns: [...remaining, nextCheckIn].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
    setState(next);
    await saveDemoState(next);
    setFormOpen(false);
  };

  const chartData = useMemo(() => state?.checkIns.slice(-7) ?? [], [state]);
  const adherence = state?.doses.length
    ? Math.round(
        (state.records.filter((record) => record.status === 'taken').length /
          state.doses.filter(
            (dose) =>
              new Date(`${dose.date}T${dose.time}:00+05:30`) <= new Date(),
          ).length) *
          100,
      )
    : 0;
  const todayCheckIn = state?.checkIns.find(
    (item) => item.date === dateKey(new Date()),
  );

  if (loading)
    return (
      <Screen withPattern>
        <ActivityIndicator
          color={careCardAccents.mint}
          accessibilityLabel="Loading recovery plan"
        />
      </Screen>
    );
  if (error)
    return (
      <Screen withPattern>
        <CareCard tone="mint">
          <AppText variant="heading">Could not load demo plan</AppText>
          <AppText muted>This is a simulated fetch error.</AppText>
        </CareCard>
        <AppButton label="Retry" onPress={() => void load()} />
      </Screen>
    );

  return (
    <Screen withPattern>
      <View style={styles.demoBanner}>
        <Ionicons name="flask-outline" size={18} color={careCardAccents.mint} />
        <AppText variant="caption" style={styles.demoText}>
          Demo data · illustrative only
        </AppText>
      </View>
      {scenario === 'offline' && (
        <View style={styles.infoBanner}>
          <AppText variant="caption">
            Offline demo data · locally saved check-ins remain available.
          </AppText>
        </View>
      )}
      {!state?.prescription ? (
        <CareCard tone="mint">
          <AppText variant="heading">No doctor-reviewed recovery plan</AppText>
          <AppText muted>
            {scenario === 'pending'
              ? 'The plan is pending doctor approval. Pending content is not shown as active.'
              : 'There is no approved plan available in this demo state.'}
          </AppText>
        </CareCard>
      ) : (
        <>
          {scenario === 'update-pending' && (
            <View style={styles.warningBanner}>
              <AppText variant="caption" style={styles.warningText}>
                A newer recovery plan version is awaiting review. This screen
                remains on approved version {state.prescription.version}.
              </AppText>
            </View>
          )}
          <CareCard tone="mint">
            <View style={styles.cardHeading}>
              <View style={styles.flex}>
                <AppText variant="heading">
                  Doctor-reviewed recovery plan
                </AppText>
                <AppText muted>
                  Dr. Demo · reviewed{' '}
                  {formatDate(state.prescription.approvalDate)}
                </AppText>
              </View>
              <View style={styles.approvedBadge}>
                <AppText variant="caption" style={styles.approvedText}>
                  Version {state.prescription.version}
                </AppText>
              </View>
            </View>
            <AppText>Reported symptoms improving.</AppText>
            <AppText variant="caption" muted>
              This summary is based on the reviewed demo plan. It is not
              generated from new check-ins.
            </AppText>
          </CareCard>
          <CareCard tone="mint">
            <AppText variant="heading">Patient-reported symptom trend</AppText>
            <AppText variant="caption" muted>
              Severity scale: 0 = no symptoms · 10 = most severe. Lower means
              less severe.
            </AppText>
            <View style={styles.chart}>
              {[10, 5, 0].map((label) => (
                <View key={label} style={styles.chartRow}>
                  <AppText variant="caption" muted style={styles.axisLabel}>
                    {label}
                  </AppText>
                  <View style={styles.barArea}>
                    {chartData.map((checkIn) => (
                      <View key={checkIn.id} style={styles.barColumn}>
                        <View
                          style={[
                            styles.bar,
                            { height: `${Math.max(8, checkIn.severity * 8)}%` },
                            checkIn.status === 'Awaiting review' &&
                              styles.awaitingBar,
                          ]}
                        />
                        <AppText variant="caption" muted>
                          {new Date(`${checkIn.date}T12:00:00`).getDate()}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <AppText variant="caption" muted>
              Reported check-ins show a mock improving trend. New entries are
              marked Awaiting review and do not change the doctor-reviewed plan.
            </AppText>
            <AppText variant="caption" style={styles.simulated}>
              Simulated summary — not a medical prediction.
            </AppText>
          </CareCard>
          <CareCard tone="purple">
            <View style={styles.cardHeading}>
              <View style={styles.flex}>
                <AppText variant="heading">Medication adherence</AppText>
                <AppText variant="caption" muted>
                  Separate from clinical recovery
                </AppText>
              </View>
              <AppText
                variant="heading"
                style={{ color: careCardAccents.purple }}
              >
                {Number.isFinite(adherence) ? `${adherence}%` : '—'}
              </AppText>
            </View>
            <AppText variant="caption" muted>
              Recording medication intake does not confirm clinical recovery.
            </AppText>
          </CareCard>
          <AppButton
            label={
              todayCheckIn ? 'Edit today’s check-in' : 'Complete daily check-in'
            }
            onPress={() => openCheckIn(todayCheckIn)}
          />
          <CareCard tone="mint">
            <AppText variant="heading">Recent check-ins</AppText>
            {[...state.checkIns]
              .reverse()
              .slice(0, 5)
              .map((checkIn) => (
                <Pressable
                  key={checkIn.id}
                  onPress={() =>
                    checkIn.date === todayCheckIn?.date && openCheckIn(checkIn)
                  }
                  style={styles.historyItem}
                >
                  <View style={styles.flex}>
                    <AppText style={styles.historyDate}>
                      {formatDate(checkIn.date)}
                    </AppText>
                    <AppText variant="caption" muted>
                      {checkIn.feeling} · severity {checkIn.severity}/10 ·{' '}
                      {checkIn.activity}
                    </AppText>
                    {checkIn.notes ? (
                      <AppText variant="caption">{checkIn.notes}</AppText>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.reviewPill,
                      checkIn.status === 'Awaiting review' &&
                        styles.awaitingPill,
                    ]}
                  >
                    <AppText variant="caption">{checkIn.status}</AppText>
                  </View>
                </Pressable>
              ))}
          </CareCard>
          <CareCard tone="mint">
            <AppText variant="heading">Doctor notes</AppText>
            <AppText muted>
              Continue observing the reported symptom pattern and bring
              questions to your follow-up.
            </AppText>
            <AppText variant="caption" style={styles.followUp}>
              Next follow-up: {formatDate(followUpDate)}
            </AppText>
          </CareCard>
          {__DEV__ && (
            <Pressable
              onPress={() => void resetDemoState(scenario).then(setState)}
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
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <AppText variant="heading">
              {editing ? 'Edit today’s check-in' : 'Daily check-in'}
            </AppText>
            <AppText variant="caption">Overall feeling</AppText>
            <ChoiceRow
              values={['Better', 'Same', 'Worse']}
              selected={feeling}
              onSelect={(value) => setFeeling(value as CheckInFeeling)}
            />
            <AppText variant="caption">
              Main symptom severity: {severity}/10
            </AppText>
            <View style={styles.numberRow}>
              {Array.from({ length: 11 }, (_, value) => (
                <Pressable
                  key={value}
                  onPress={() => setSeverity(value)}
                  style={[
                    styles.numberButton,
                    value === severity && styles.numberActive,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={
                      value === severity ? { color: '#FFFFFF' } : undefined
                    }
                  >
                    {value}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <AppText variant="caption">
              Ability to perform daily activities
            </AppText>
            <ChoiceRow
              values={['Normal', 'Some difficulty', 'Significant difficulty']}
              selected={activity}
              onSelect={(value) => setActivity(value as ActivityLevel)}
            />
            <AppText variant="caption">Side effects</AppText>
            <TextInput
              placeholderTextColor={colors.secondary}
              selectionColor={colors.primary}
              value={sideEffects}
              onChangeText={setSideEffects}
              placeholder="None reported / add details"
              style={styles.input}
            />
            <TextInput
              placeholderTextColor={colors.secondary}
              selectionColor={colors.primary}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              multiline
              style={[styles.input, styles.notesInput]}
            />
            <AppButton
              label="Save check-in"
              onPress={() => void saveCheckIn()}
            />
            <Pressable onPress={() => setFormOpen(false)}>
              <AppText style={styles.cancel}>Cancel</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ChoiceRow({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.choiceRow}>
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          style={[styles.choice, selected === value && styles.choiceActive]}
        >
          <AppText variant="caption">{value}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    demoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.subtle,
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
      backgroundColor: colors.selected,
      borderColor: colors.accent,
    },
    infoBanner: {
      padding: spacing.sm,
      backgroundColor: colors.subtle,
      borderRadius: radius.sm,
    },
    warningBanner: {
      padding: spacing.sm,
      backgroundColor: colors.warningSurface,
      borderRadius: radius.sm,
    },
    warningText: { color: colors.warningText },
    cardHeading: { flexDirection: 'row', gap: spacing.sm },
    approvedBadge: {
      backgroundColor: colors.successSurface,
      borderRadius: 20,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      height: 28,
    },
    approvedText: { color: colors.successText, fontWeight: '700' },
    chart: { gap: spacing.xs, marginTop: spacing.md },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 38 },
    axisLabel: { width: 24 },
    barArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      borderBottomWidth: 1,
      borderColor: colors.border,
      height: '100%',
    },
    barColumn: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 2,
    },
    bar: {
      width: 20,
      minHeight: 4,
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    awaitingBar: { backgroundColor: colors.warning },
    simulated: { color: colors.secondary, fontStyle: 'italic' },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyDate: { fontWeight: '700' },
    reviewPill: {
      backgroundColor: colors.successSurface,
      padding: spacing.xs,
      borderRadius: 14,
    },
    awaitingPill: { backgroundColor: colors.warningSurface },
    followUp: { color: colors.primary, fontWeight: '700' },
    reset: { alignItems: 'center', padding: spacing.md },
    detailsText: { color: colors.primary, fontWeight: '700' },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    choice: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    choiceActive: {
      backgroundColor: colors.selected,
      borderColor: colors.accent,
    },
    numberRow: { flexDirection: 'row', justifyContent: 'space-between' },
    numberButton: {
      width: 26,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.subtle,
    },
    numberActive: { backgroundColor: colors.button },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      color: colors.text,
    },
    notesInput: { minHeight: 64, textAlignVertical: 'top' },
    cancel: {
      color: colors.secondary,
      textAlign: 'center',
      padding: spacing.sm,
    },
  });
