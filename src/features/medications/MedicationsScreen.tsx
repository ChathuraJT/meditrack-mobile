import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { spacing, radius } from '@/theme/tokens';

interface MedicationDose {
  id: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  timeString: string;
  medicine: string;
  dosage: string;
  mealInstruction: string;
  taken: boolean;
  prescribedBy: string;
}

export function MedicationsScreen() {
  // Daily Medication Doses
  const [medications, setMedications] = useState<MedicationDose[]>([
    {
      id: 'med-1',
      timeSlot: 'Morning',
      timeString: '08:00 AM',
      medicine: 'Metformin 500mg',
      dosage: '1 Tablet',
      mealInstruction: 'After breakfast',
      taken: true,
      prescribedBy: 'Dr. Nimal Silva',
    },
    {
      id: 'med-2',
      timeSlot: 'Morning',
      timeString: '08:30 AM',
      medicine: 'Paracetamol 500mg',
      dosage: '2 Tablets',
      mealInstruction: 'After food',
      taken: true,
      prescribedBy: 'Dr. Priyantha Perera',
    },
    {
      id: 'med-3',
      timeSlot: 'Afternoon',
      timeString: '01:30 PM',
      medicine: 'Amoxicillin 250mg',
      dosage: '1 Capsule',
      mealInstruction: 'After lunch',
      taken: true,
      prescribedBy: 'Dr. Priyantha Perera',
    },
    {
      id: 'med-4',
      timeSlot: 'Evening',
      timeString: '06:30 PM',
      medicine: 'Vitamin C 500mg',
      dosage: '1 Chewable Tab',
      mealInstruction: 'With water',
      taken: false,
      prescribedBy: 'Dr. Nimal Silva',
    },
    {
      id: 'med-5',
      timeSlot: 'Night',
      timeString: '09:30 PM',
      medicine: 'Montelukast 10mg',
      dosage: '1 Tablet',
      mealInstruction: 'Before bedtime',
      taken: false,
      prescribedBy: 'Dr. Anusha Senaratne',
    },
  ]);

  // Toggle Medication Checkbox
  const toggleDose = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, taken: !med.taken } : med)),
    );
  };

  const completedDoses = medications.filter((m) => m.taken).length;
  const adherenceRate = Math.round((completedDoses / medications.length) * 100);

  return (
    <Screen>
      <AppCard style={styles.card}>
        <View style={styles.medHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconSquareBlue}>
              <Ionicons name="medical-outline" size={18} color="#145DA0" />
            </View>
            <View>
              <AppText variant="heading" style={styles.sectionHeading}>
                Daily Medication Schedule
              </AppText>
              <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                Track and confirm your daily prescribed doses
              </AppText>
            </View>
          </View>
          <View style={styles.adherenceBadge}>
            <AppText variant="caption" style={styles.adherenceBadgeText}>
              {adherenceRate}% Adherence
            </AppText>
            <AppText variant="caption" muted style={styles.adherenceSubText}>
              {completedDoses} of {medications.length} Taken
            </AppText>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[styles.progressBarFill, { width: `${adherenceRate}%` }]}
          />
        </View>

        {/* Medication Dose Items */}
        <View style={styles.medList}>
          {medications.map((med) => (
            <Pressable
              key={med.id}
              style={[styles.medItem, med.taken && styles.medItemTaken]}
              onPress={() => toggleDose(med.id)}
            >
              <View style={styles.medItemLeft}>
                <View
                  style={[styles.checkbox, med.taken && styles.checkboxChecked]}
                >
                  {med.taken && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.medNameRow}>
                    <AppText
                      style={[
                        styles.medNameText,
                        med.taken && styles.medNameTaken,
                      ]}
                    >
                      {med.medicine}
                    </AppText>
                    <View style={styles.dosageBadge}>
                      <AppText variant="caption" style={styles.dosageText}>
                        {med.dosage}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="caption" muted>
                    {med.mealInstruction} •{' '}
                    <AppText
                      variant="caption"
                      style={{ fontWeight: '700', color: '#334155' }}
                    >
                      {med.timeSlot} ({med.timeString})
                    </AppText>
                  </AppText>
                </View>
              </View>

              <View style={styles.medStatusBox}>
                <View
                  style={[
                    styles.medStatusPill,
                    med.taken
                      ? styles.medStatusPillDone
                      : styles.medStatusPillDue,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={
                      med.taken
                        ? styles.medStatusTextDone
                        : styles.medStatusTextDue
                    }
                  >
                    {med.taken ? 'Taken' : 'Due Soon'}
                  </AppText>
                </View>
                <AppText variant="caption" muted style={styles.medDocText}>
                  {med.prescribedBy}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F2',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  iconSquareBlue: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234B',
  },
  medHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adherenceBadge: {
    alignItems: 'flex-end',
  },
  adherenceBadgeText: {
    backgroundColor: '#E6F4FE',
    color: '#145DA0',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adherenceSubText: {
    fontSize: 10,
    marginTop: 2,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#DCE7F2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  medList: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  medItem: {
    backgroundColor: '#F3F8FC',
    borderWidth: 1,
    borderColor: '#DCE7F2',
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medItemTaken: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  medItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234B',
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  dosageBadge: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  dosageText: {
    color: '#145DA0',
    fontWeight: '700',
    fontSize: 10,
  },
  medStatusBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  medStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  medStatusPillDone: {
    backgroundColor: '#D1FAE5',
  },
  medStatusPillDue: {
    backgroundColor: '#FEF3C7',
  },
  medStatusTextDone: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 10,
  },
  medStatusTextDue: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 10,
  },
  medDocText: {
    fontSize: 9,
  },
});
