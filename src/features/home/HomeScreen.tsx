import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiFetch } from '@/lib/api';
import { colors, spacing, radius } from '@/theme/tokens';

interface Doctor {
  doctor_id: string;
  register_id: string;
  doctors_name: string;
  degrees: string;
  working_hospital: string;
  is_available?: boolean;
  available_until?: string | null;
}

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

interface QueueStatus {
  has_appointment: boolean;
  appointment?: {
    id: number;
    my_token: string;
    my_token_number: number;
    doctor_name: string;
    doctor_id: string;
    hospital_name: string;
    appointment_date: string;
    session_start_time: string;
    current_serving_token: string;
    patients_ahead: number;
    estimated_wait_minutes: number;
    status: string;
    estimated_time: string;
  };
}

const DEFAULT_DOCTORS: Doctor[] = [
  {
    doctor_id: 'DOC-0003',
    register_id: 'SLMC-10003',
    doctors_name: 'Dr. CS023',
    degrees: 'MBBS, MD',
    working_hospital: 'MediTrack General Hospital',
    is_available: true,
    available_until: '05:00 PM',
  },
  {
    doctor_id: 'DOC-0001',
    register_id: 'SLMC-10002',
    doctors_name: 'Dr. Priya Singh',
    degrees: 'MBBS, MD',
    working_hospital: 'MediTrack General Hospital',
    is_available: true,
    available_until: '05:00 PM',
  },
  {
    doctor_id: 'DOC-0004',
    register_id: 'SLMC-10004',
    doctors_name: 'Dr. Chathura',
    degrees: 'MBBS',
    working_hospital: 'National Hospital of Sri Lanka',
    is_available: false,
  },
  {
    doctor_id: 'DOC-0010',
    register_id: 'SLMC-10010',
    doctors_name: 'Dr. Saman',
    degrees: 'MBBS',
    working_hospital: 'Matara General Hospital',
    is_available: false,
  },
];

export function HomeScreen() {
  const { session } = useAuth();
  const username = session?.user?.username || 'Dulaksha';

  // Live Queue State from Backend
  const [queueData, setQueueData] = useState<QueueStatus | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);

  // Doctor Selection & Filter State
  const [selectedQueueDoctor, setSelectedQueueDoctor] = useState<Doctor | null>(null);
  const [consultantFilter, setConsultantFilter] = useState<'all' | 'available'>('all');

  // Booking Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingReason, setBookingReason] = useState('');
  const [availability, setAvailability] = useState<{
    checked: boolean;
    available: boolean;
    doctor_name?: string;
    start_time?: string;
    end_time?: string;
    next_token?: string;
    message?: string;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

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

  // Doctors Search
  const [doctors, setDoctors] = useState<Doctor[]>(DEFAULT_DOCTORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Toggle Medication Checkbox
  const toggleDose = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, taken: !med.taken } : med))
    );
  };

  const completedDoses = medications.filter((m) => m.taken).length;
  const adherenceRate = Math.round((completedDoses / medications.length) * 100);

  // Fetch Live Queue from Backend
  const fetchLiveQueue = async () => {
    try {
      setLoadingQueue(true);
      const data = await apiFetch(`/api/appointments/my-queue/?username=${encodeURIComponent(username)}`);
      if (data) {
        setQueueData(data);
      }
    } catch (e) {
      console.warn('Queue fetch failed:', e);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
  }, [username]);

  // Load doctors from backend API
  useEffect(() => {
    async function loadDoctors() {
      try {
        setLoadingDoctors(true);
        const data = await apiFetch('/get-doctor/');
        if (data?.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors);
          const live = data.doctors.find((d: Doctor) => d.is_available);
          setSelectedQueueDoctor((prev) => prev || live || data.doctors[0]);
        }
      } catch {
        // Fallback to verified local doctors
      } finally {
        setLoadingDoctors(false);
      }
    }
    loadDoctors();
  }, []);

  // Check Doctor Availability when modal opens or date changes
  const checkAvailability = async (docId: string, date: string) => {
    try {
      setCheckingAvailability(true);
      setAvailability(null);
      const res = await apiFetch(`/api/appointments/availability/?doctor_id=${encodeURIComponent(docId)}&date=${encodeURIComponent(date)}`);
      if (res) {
        setAvailability({
          checked: true,
          available: !!res.available,
          doctor_name: res.doctor_name,
          start_time: res.start_time,
          end_time: res.end_time,
          next_token: res.next_token,
          message: res.message,
        });
        if (res.doctor_name) {
          setSelectedDoctorForBooking((prev) =>
            prev ? { ...prev, doctors_name: res.doctor_name } : prev
          );
        }
      }
    } catch {
      setAvailability({
        checked: true,
        available: false,
        message: 'Could not verify doctor schedule. Please try again.',
      });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleOpenBooking = (doc: Doctor) => {
    setSelectedDoctorForBooking(doc);
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
    setBookingReason('');
    setBookingModalVisible(true);
    checkAvailability(doc.doctor_id, today);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctorForBooking || !availability?.available) return;

    try {
      setBookingSubmitting(true);
      const res = await apiFetch('/api/appointments/book/', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: selectedDoctorForBooking.doctor_id,
          doctor_name: selectedDoctorForBooking.doctors_name,
          hospital_name: selectedDoctorForBooking.working_hospital,
          appointment_date: bookingDate,
          patient_username: username,
          reason: bookingReason,
        }),
      });

      if (res?.appointment) {
        setBookingModalVisible(false);
        await fetchLiveQueue();
        Alert.alert(
          'Queue Token Confirmed! 🎉',
          `Your queue token is ${res.appointment.token_label}.\n\nDoctor: ${res.appointment.doctor_name}\nTime: ${res.appointment.session_start_time || '09:00 AM'}\nEstimated Wait: ${res.appointment.estimated_wait_minutes || 0} mins`,
          [{ text: 'View Queue Pass', onPress: () => setPassModalVisible(true) }]
        );
      }
    } catch (err: any) {
      Alert.alert('Booking Notice', err?.message || 'Could not complete booking. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const activeQueueDoctor = selectedQueueDoctor || doctors.find((d) => d.is_available) || doctors[0];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.doctors_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.degrees?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.working_hospital?.toLowerCase().includes(searchQuery.toLowerCase());
    if (consultantFilter === 'available') {
      return matchesSearch && doc.is_available;
    }
    return matchesSearch;
  });

  const activeAppt = queueData?.appointment;

  return (
    <Screen withPattern={false}>
      {/* ========================================================================= */}
      {/* 1. PATIENT HEALTH IDENTITY CARD (SL-HEALTH-PASS)                          */}
      {/* ========================================================================= */}
      <AppCard style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.badgeRow}>
            <View style={styles.portalBadge}>
              <AppText variant="caption" style={styles.portalBadgeText}>
                PATIENT PORTAL
              </AppText>
            </View>
            <View style={styles.passBadge}>
              <AppText variant="caption" style={styles.passBadgeText}>
                SL-HEALTH-PASS
              </AppText>
            </View>
          </View>
          <AppText variant="caption" muted style={{ fontWeight: '600' }}>
            ID: PAT-2026-088
          </AppText>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>
              {username.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="heading" style={styles.patientName}>
              {username}
            </AppText>
            <View style={styles.metaRow}>
              <AppText variant="caption" muted>Age: 24 Yrs</AppText>
              <AppText variant="caption" muted> • </AppText>
              <AppText variant="caption" muted>Gender: Female</AppText>
              <AppText variant="caption" muted> • </AppText>
              <AppText variant="caption" style={styles.bloodText}>
                Blood: <AppText variant="caption" style={styles.bloodValue}>O+</AppText>
              </AppText>
            </View>
          </View>
        </View>

        {/* Documented Drug Allergies */}
        <View style={styles.allergyBox}>
          <View style={styles.allergyHeader}>
            <View style={styles.allergyTitleRow}>
              <Ionicons name="warning-outline" size={15} color="#E11D48" />
              <AppText variant="caption" style={styles.allergyTitle}>
                DOCUMENTED DRUG ALLERGIES
              </AppText>
            </View>
            <View style={styles.activeAlertBadge}>
              <AppText variant="caption" style={styles.activeAlertText}>
                Active Alert
              </AppText>
            </View>
          </View>
          <View style={styles.allergyChipsRow}>
            <View style={styles.allergyChip}>
              <AppText variant="caption" style={styles.allergyChipText}>
                Penicillin
              </AppText>
            </View>
            <View style={styles.allergyChip}>
              <AppText variant="caption" style={styles.allergyChipText}>
                Aspirin
              </AppText>
            </View>
            <AppText variant="caption" muted style={styles.allergyNote}>
              Strictly cross-screened
            </AppText>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencyRow}>
          <Ionicons name="call-outline" size={14} color="#64748B" />
          <AppText variant="caption" muted style={{ flex: 1 }}>
            Emergency Contact:{' '}
            <AppText variant="caption" style={{ fontWeight: '700', color: '#0F172A' }}>
              +94 77 123 4567
            </AppText>
          </AppText>
          <Pressable onPress={() => Linking.openURL('tel:1990')}>
            <AppText variant="caption" style={styles.emergencyCallLink}>
              Call 1990
            </AppText>
          </Pressable>
        </View>
      </AppCard>

      {/* ========================================================================= */}
      {/* 2. LIVE CLINIC QUEUE STATUS CARD (Real Backend Data)                       */}
      {/* ========================================================================= */}
      <View style={styles.queueCard}>
        {/* Header */}
        <View style={styles.queueHeader}>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.pulsingDot} />
            <AppText variant="caption" style={styles.queueHeaderTitle}>
              LIVE CLINIC QUEUE STATUS
            </AppText>
          </View>
          <View style={styles.activeConsultBadge}>
            <AppText variant="caption" style={styles.activeConsultText}>
              {activeAppt ? 'Token Active' : 'No Active Queue'}
            </AppText>
          </View>
        </View>

        {/* 3 Metric Tiles */}
        <View style={styles.queueMetricsRow}>
          {/* Your Token */}
          <View style={styles.queueTile}>
            <AppText variant="caption" style={styles.queueTileLabel}>
              Your Token
            </AppText>
            <AppText style={styles.queueTileBigValue}>
              {activeAppt ? activeAppt.my_token : '#--'}
            </AppText>
            <AppText variant="caption" style={styles.queueTileSubTextGreen}>
              {activeAppt ? `Date: ${activeAppt.appointment_date}` : 'Not Booked'}
            </AppText>
          </View>

          {/* Now Calling */}
          <View style={[styles.queueTile, styles.queueTileHighlight]}>
            <View style={styles.tileCallingHeader}>
              <View style={styles.amberDot} />
              <AppText variant="caption" style={styles.queueTileLabelAmber}>
                Now Serving
              </AppText>
            </View>
            <AppText style={styles.queueTileBigValueAmber}>
              {activeAppt ? activeAppt.current_serving_token : '#01'}
            </AppText>
            <AppText variant="caption" style={styles.queueTileSubTextLight}>
              {activeAppt ? `${activeAppt.patients_ahead} ahead` : 'Queue idle'}
            </AppText>
          </View>

          {/* Est Wait */}
          <View style={styles.queueTile}>
            <AppText variant="caption" style={styles.queueTileLabel}>
              Est. Wait
            </AppText>
            <AppText style={styles.queueTileBigValue}>
              {activeAppt ? `${activeAppt.estimated_wait_minutes}m` : '--'}
            </AppText>
            <AppText variant="caption" style={styles.queueTileSubTextLight}>
              ~10m / patient
            </AppText>
          </View>
        </View>

        {/* Doctor Selection Chips - Allow Patient to select from Available Doctors */}
        {!activeAppt && (
          <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <AppText variant="caption" style={{ color: '#E9D5FF', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }}>
                SELECT DOCTOR TO CONSULT:
              </AppText>
              <View style={{ backgroundColor: '#22C55E25', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#22C55E50' }}>
                <AppText variant="caption" style={{ color: '#4ADE80', fontWeight: '800', fontSize: 10 }}>
                  {doctors.filter((d) => d.is_available).length} DOCTORS LIVE
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {doctors.map((doc) => {
                const isSelected = activeQueueDoctor?.doctor_id === doc.doctor_id;
                return (
                  <Pressable
                    key={doc.doctor_id}
                    onPress={() => setSelectedQueueDoctor(doc)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 14,
                      backgroundColor: isSelected ? '#FFFFFF' : '#3B076470',
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#C084FC' : doc.is_available ? '#22C55E60' : '#581C87',
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: doc.is_available ? '#22C55E' : '#94A3B8',
                      }}
                    />
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? '#581C87' : '#FFFFFF',
                      }}
                    >
                      {doc.doctors_name}
                    </AppText>
                    {doc.is_available ? (
                      <View
                        style={{
                          backgroundColor: isSelected ? '#DCFCE7' : '#16A34A',
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                          borderRadius: 6,
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 9,
                            fontWeight: '800',
                            color: isSelected ? '#15803D' : '#FFFFFF',
                          }}
                        >
                          LIVE
                        </AppText>
                      </View>
                    ) : (
                      <AppText style={{ fontSize: 9, color: isSelected ? '#64748B' : '#A855F7', fontWeight: '500' }}>
                        Offline
                      </AppText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Doctor & Clinic Info */}
        <View style={styles.queueFooter}>
          <View style={styles.doctorInfoRow}>
            <View style={styles.doctorIconBox}>
              <Ionicons name="medkit-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.queueDoctorName}>
                {activeAppt ? activeAppt.doctor_name : (activeQueueDoctor?.is_available ? `${activeQueueDoctor.doctors_name} is Online` : `${activeQueueDoctor?.doctors_name || 'Doctor'} is Offline`)}
              </AppText>
              <AppText variant="caption" style={styles.queueRoomText}>
                {activeAppt ? (activeAppt.hospital_name || 'Colombo Outpatient Clinic') : (activeQueueDoctor?.is_available ? `Available until ${activeQueueDoctor.available_until || '05:00 PM'} • Tap Book Token` : 'Currently not accepting appointments')}
              </AppText>
            </View>
          </View>

          {activeAppt ? (
            <Pressable
              style={styles.viewPassButton}
              onPress={() => setPassModalVisible(true)}
            >
              <AppText style={styles.viewPassButtonText}>Digital Pass</AppText>
              <Ionicons name="chevron-forward" size={14} color="#581C87" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.viewPassButton, !activeQueueDoctor?.is_available && { opacity: 0.6 }]}
              onPress={() => {
                if (activeQueueDoctor) handleOpenBooking(activeQueueDoctor);
              }}
            >
              <AppText style={styles.viewPassButtonText}>
                {activeQueueDoctor?.is_available ? 'Book Token' : 'Doctor Offline'}
              </AppText>
              <Ionicons name="add" size={14} color="#581C87" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3. DAILY MEDICATION SCHEDULE ("Bonna Beth Schedule")                      */}
      {/* ========================================================================= */}
      <AppCard style={styles.card}>
        <View style={styles.medHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconSquarePurple}>
              <Ionicons name="medical-outline" size={18} color="#7C3AED" />
            </View>
            <View>
              <AppText variant="heading" style={styles.sectionHeading}>
                Daily Medication Schedule
              </AppText>
              <AppText variant="caption" muted>
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
            style={[
              styles.progressBarFill,
              { width: `${adherenceRate}%` },
            ]}
          />
        </View>

        {/* Medication Dose Items */}
        <View style={styles.medList}>
          {medications.map((med) => (
            <Pressable
              key={med.id}
              style={[
                styles.medItem,
                med.taken && styles.medItemTaken,
              ]}
              onPress={() => toggleDose(med.id)}
            >
              <View style={styles.medItemLeft}>
                <View
                  style={[
                    styles.checkbox,
                    med.taken && styles.checkboxChecked,
                  ]}
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
                    <AppText variant="caption" style={{ fontWeight: '700', color: '#334155' }}>
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

      {/* ========================================================================= */}
      {/* 4. REGIONAL VIRAL OUTBREAK RADAR                                          */}
      {/* ========================================================================= */}
      <AppCard style={styles.card}>
        <View style={styles.radarHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconSquareAmber}>
              <Ionicons name="radio-outline" size={18} color="#D97706" />
            </View>
            <View>
              <AppText variant="heading" style={styles.sectionHeading}>
                Regional Viral Outbreak Radar
              </AppText>
              <AppText variant="caption" muted>
                Epidemic surveillance & district threat levels
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={() => router.navigate('/map')}
            style={styles.radarMapLink}
          >
            <AppText variant="caption" style={styles.radarMapLinkText}>
              Radar Map
            </AppText>
            <Ionicons name="chevron-forward" size={13} color="#7C3AED" />
          </Pressable>
        </View>

        <View style={styles.districtList}>
          {/* Colombo District */}
          <View style={styles.districtAlertBoxRed}>
            <View style={styles.districtHeader}>
              <View style={styles.districtNameRow}>
                <Ionicons name="warning" size={15} color="#E11D48" />
                <AppText style={styles.districtTitleRed}>Colombo District</AppText>
              </View>
              <View style={styles.highSpikeBadge}>
                <AppText variant="caption" style={styles.highSpikeText}>
                  High Spike
                </AppText>
              </View>
            </View>
            <AppText variant="caption" style={styles.districtDescRed}>
              <AppText variant="caption" style={{ fontWeight: '700', color: '#9F1239' }}>
                Influenza A & Dengue Serotype 2:
              </AppText>{' '}
              342 localized cases detected in the past 7 days.
            </AppText>
          </View>

          {/* Gampaha District */}
          <View style={styles.districtAlertBoxAmber}>
            <View style={styles.districtHeader}>
              <View style={styles.districtNameRow}>
                <Ionicons name="thermometer-outline" size={15} color="#D97706" />
                <AppText style={styles.districtTitleAmber}>Gampaha District</AppText>
              </View>
              <View style={styles.moderateBadge}>
                <AppText variant="caption" style={styles.moderateText}>
                  Moderate
                </AppText>
              </View>
            </View>
            <AppText variant="caption" style={styles.districtDescAmber}>
              Seasonal viral pharyngitis cases rising (+18% week-over-week).
            </AppText>
          </View>

          {/* Kandy District */}
          <View style={styles.districtAlertBoxGreen}>
            <View style={styles.districtHeader}>
              <View style={styles.districtNameRow}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
                <AppText style={styles.districtTitleGreen}>Kandy District</AppText>
              </View>
              <AppText variant="caption" style={styles.lowRiskText}>
                Normal Baseline (Low Risk)
              </AppText>
            </View>
          </View>
        </View>
      </AppCard>

      {/* ========================================================================= */}
      {/* 5. FIND MEDICAL CONSULTANTS & LIVE QUEUE BOOKING                          */}
      {/* ========================================================================= */}
      <AppCard style={styles.card}>
        <View style={styles.doctorsHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconSquareBlue}>
              <Ionicons name="medkit-outline" size={18} color="#2563EB" />
            </View>
            <View>
              <AppText variant="heading" style={styles.sectionHeading}>
                Find Medical Consultants
              </AppText>
              <AppText variant="caption" muted>
                Select doctor & book an official queue token
              </AppText>
            </View>
          </View>
        </View>

        {/* Available Filter Toggle Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
          <Pressable
            onPress={() => setConsultantFilter('all')}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: consultantFilter === 'all' ? '#7C3AED' : '#F1F5F9',
            }}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: consultantFilter === 'all' ? '#FFFFFF' : '#64748B',
              }}
            >
              All Doctors ({doctors.length})
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setConsultantFilter('available')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: consultantFilter === 'available' ? '#16A34A' : '#DCFCE7',
              borderWidth: 1,
              borderColor: '#86EFAC',
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: consultantFilter === 'available' ? '#FFFFFF' : '#16A34A' }} />
            <AppText
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: consultantFilter === 'available' ? '#FFFFFF' : '#15803D',
              }}
            >
              Available Now ({doctors.filter((d) => d.is_available).length})
            </AppText>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Search doctor, hospital, degree..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* Doctors List */}
        {loadingDoctors ? (
          <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.doctorsList}>
            {filteredDoctors.map((doc) => (
              <View key={doc.doctor_id} style={styles.doctorCard}>
                <View style={styles.docCardTop}>
                  <View style={styles.docAvatar}>
                    <AppText style={styles.docAvatarText}>DR</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {doc.is_available ? (
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#86EFAC', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
                        <AppText variant="caption" style={{ color: '#15803D', fontWeight: '700', fontSize: 10 }}>
                          Online {doc.available_until ? `(${doc.available_until})` : ''}
                        </AppText>
                      </View>
                    ) : (
                      <View style={styles.regBadge}>
                        <AppText variant="caption" style={styles.regBadgeText}>
                          {doc.register_id}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>

                <AppText style={styles.doctorNameText}>
                  {doc.doctors_name}
                </AppText>
                <AppText variant="caption" style={styles.doctorDegreesText}>
                  {doc.degrees}
                </AppText>
                <AppText variant="caption" muted style={styles.doctorHospitalText}>
                  {doc.working_hospital}
                </AppText>

                <Pressable
                  style={[styles.docBookButton, doc.is_available && { backgroundColor: '#16A34A' }]}
                  onPress={() => handleOpenBooking(doc)}
                >
                  <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                  <AppText style={styles.docBookButtonText}>
                    {doc.is_available ? 'Book Queue Token (Live)' : 'Book Queue Token'}
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </AppCard>

      {/* ========================================================================= */}
      {/* 6. APPOINTMENT QUEUE BOOKING MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBookingModalVisible(false)}
        >
          <Pressable style={styles.bookingModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <AppText variant="heading" style={styles.modalTitle}>
                  Book Queue Token
                </AppText>
                <AppText variant="caption" muted>
                  Verified appointment through clinic queue
                </AppText>
              </View>
              <Pressable onPress={() => setBookingModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#64748B" />
              </Pressable>
            </View>

            {selectedDoctorForBooking && (
              <View style={styles.selectedDocBox}>
                <View style={styles.docAvatar}>
                  <AppText style={styles.docAvatarText}>DR</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.doctorNameText}>
                    {selectedDoctorForBooking.doctors_name}
                  </AppText>
                  <AppText variant="caption" muted>
                    {selectedDoctorForBooking.degrees} • {selectedDoctorForBooking.working_hospital}
                  </AppText>
                </View>
              </View>
            )}

            {/* Quick Doctor Switcher inside Modal */}
            <View style={{ marginBottom: 14 }}>
              <AppText variant="caption" style={{ fontWeight: '700', color: '#475569', marginBottom: 6, fontSize: 11, textTransform: 'uppercase' }}>
                Switch Doctor:
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {doctors.map((doc) => {
                  const isCur = selectedDoctorForBooking?.doctor_id === doc.doctor_id;
                  return (
                    <Pressable
                      key={doc.doctor_id}
                      onPress={() => {
                        setSelectedDoctorForBooking(doc);
                        checkAvailability(doc.doctor_id, bookingDate);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: isCur ? '#7C3AED' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: isCur ? '#7C3AED' : doc.is_available ? '#86EFAC' : '#E2E8F0',
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isCur ? '#FFFFFF' : doc.is_available ? '#16A34A' : '#94A3B8',
                        }}
                      />
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: isCur ? '800' : '600',
                          color: isCur ? '#FFFFFF' : '#1E293B',
                        }}
                      >
                        {doc.doctors_name}
                      </AppText>
                      {doc.is_available && (
                        <AppText
                          style={{
                            fontSize: 9,
                            fontWeight: '700',
                            color: isCur ? '#A7F3D0' : '#15803D',
                          }}
                        >
                          LIVE
                        </AppText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.fieldBlock}>
              <AppText variant="caption" style={styles.fieldLabel}>
                Appointment Date (YYYY-MM-DD)
              </AppText>
              <View style={styles.dateInputRow}>
                <Ionicons name="calendar" size={16} color="#7C3AED" />
                <TextInput
                  value={bookingDate}
                  onChangeText={(text) => {
                    setBookingDate(text);
                    if (selectedDoctorForBooking && text.length === 10) {
                      checkAvailability(selectedDoctorForBooking.doctor_id, text);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateTextInput}
                />
              </View>
            </View>

            {/* Doctor Availability Live Status */}
            {checkingAvailability ? (
              <View style={styles.checkingBox}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <AppText variant="caption" muted>Checking doctor consultation schedule...</AppText>
              </View>
            ) : availability ? (
              availability.available ? (
                <View style={styles.availBoxGreen}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.availTitleGreen}>
                      Doctor Available Today
                    </AppText>
                    <AppText variant="caption" style={styles.availDescGreen}>
                      Hours: {availability.start_time} - {availability.end_time} • Next Token: {availability.next_token}
                    </AppText>
                  </View>
                </View>
              ) : (
                <View style={styles.availBoxAmber}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.availTitleAmber}>
                      Doctor Not Available
                    </AppText>
                    <AppText variant="caption" style={styles.availDescAmber}>
                      {availability.message || 'The doctor has not scheduled consultation hours on this date.'}
                    </AppText>
                  </View>
                </View>
              )
            ) : null}

            {/* Reason for Visit */}
            <View style={styles.fieldBlock}>
              <AppText variant="caption" style={styles.fieldLabel}>
                Reason for Visit / Symptoms (Optional)
              </AppText>
              <TextInput
                value={bookingReason}
                onChangeText={setBookingReason}
                placeholder="e.g. Headache, Routine checkup, Blood pressure check"
                placeholderTextColor="#94A3B8"
                style={styles.reasonInput}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Action Buttons */}
            <Pressable
              style={[
                styles.confirmBookingButton,
                (!availability?.available || bookingSubmitting) && styles.confirmBookingDisabled,
              ]}
              disabled={!availability?.available || bookingSubmitting}
              onPress={handleConfirmBooking}
            >
              {bookingSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText style={styles.confirmBookingText}>
                  {availability?.available ? 'Confirm & Get Queue Token' : 'Doctor Unavailable on Selected Date'}
                </AppText>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. DIGITAL QUEUE PASS MODAL                                               */}
      {/* ========================================================================= */}
      <Modal
        visible={passModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPassModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPassModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="heading" style={styles.modalTitle}>
                Digital Clinic Pass
              </AppText>
              <Pressable onPress={() => setPassModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.modalPassCard}>
              <AppText variant="caption" style={styles.modalClinicName}>
                {activeAppt?.hospital_name || 'COLOMBO OUTPATIENT CLINIC'}
              </AppText>
              <AppText style={styles.modalBigToken}>
                {activeAppt ? activeAppt.my_token : '#01'}
              </AppText>
              <AppText variant="caption" style={styles.modalTokenDesc}>
                Assigned to {username}
              </AppText>

              <View style={styles.modalDivider} />

              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>Consultant:</AppText>
                <AppText variant="caption" style={{ fontWeight: '700' }}>
                  {activeAppt ? activeAppt.doctor_name : 'Dr. Priyantha Perera'}
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>Date:</AppText>
                <AppText variant="caption" style={{ fontWeight: '700' }}>
                  {activeAppt?.appointment_date || 'Today'}
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>Session Time:</AppText>
                <AppText variant="caption" style={{ fontWeight: '700' }}>
                  {activeAppt?.session_start_time || '09:00 AM'}
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>Now Calling:</AppText>
                <AppText variant="caption" style={{ fontWeight: '700', color: '#D97706' }}>
                  {activeAppt?.current_serving_token || '#01'} ({activeAppt?.patients_ahead || 0} Ahead)
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>Est. Turn:</AppText>
                <AppText variant="caption" style={{ fontWeight: '700', color: '#059669' }}>
                  {activeAppt?.estimated_time || '09:00 AM'} (~{activeAppt?.estimated_wait_minutes || 0} mins)
                </AppText>
              </View>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setPassModalVisible(false)}
            >
              <AppText style={styles.modalCloseButtonText}>Done</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  portalBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  portalBadgeText: {
    color: '#7E22CE',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  passBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  passBadgeText: {
    color: '#4338CA',
    fontWeight: '800',
    fontSize: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bloodText: {
    color: '#64748B',
  },
  bloodValue: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  allergyBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  allergyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allergyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  allergyTitle: {
    color: '#9F1239',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  activeAlertBadge: {
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeAlertText: {
    color: '#E11D48',
    fontWeight: '800',
    fontSize: 10,
  },
  allergyChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyChip: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  allergyChipText: {
    color: '#9F1239',
    fontWeight: '700',
    fontSize: 11,
  },
  allergyNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 4,
  },
  emergencyCallLink: {
    color: '#DC2626',
    fontWeight: '800',
  },

  // Live Queue Status Card (Deep Royal Purple)
  queueCard: {
    backgroundColor: '#581C87',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#581C87',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: spacing.xs,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  queueHeaderTitle: {
    color: '#E9D5FF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  activeConsultBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeConsultText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  queueMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  queueTile: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  queueTileHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  queueTileLabel: {
    color: '#E9D5FF',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  tileCallingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
  },
  queueTileLabelAmber: {
    color: '#FBBF24',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  queueTileBigValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
  },
  queueTileBigValueAmber: {
    color: '#FBBF24',
    fontWeight: '900',
    fontSize: 24,
  },
  queueTileSubTextGreen: {
    color: '#6EE7B7',
    fontWeight: '700',
    fontSize: 10,
  },
  queueTileSubTextLight: {
    color: '#E9D5FF',
    fontSize: 10,
  },
  queueFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  doctorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueDoctorName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  queueRoomText: {
    color: '#E9D5FF',
    fontSize: 10,
  },
  viewPassButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewPassButtonText: {
    color: '#581C87',
    fontWeight: '800',
    fontSize: 11,
  },

  // Daily Medication
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  iconSquarePurple: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSquareAmber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSquareBlue: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#F3E8FF',
    color: '#7E22CE',
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
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  dosageBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  dosageText: {
    color: '#7E22CE',
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

  // Regional Viral Radar
  radarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarMapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  radarMapLinkText: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 11,
  },
  districtList: {
    gap: spacing.xs,
  },
  districtAlertBoxRed: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  districtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  districtNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  districtTitleRed: {
    color: '#9F1239',
    fontWeight: '800',
    fontSize: 12,
  },
  highSpikeBadge: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  highSpikeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  districtDescRed: {
    color: '#881337',
    fontSize: 11,
    lineHeight: 16,
  },
  districtAlertBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  districtTitleAmber: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 12,
  },
  moderateBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moderateText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
  },
  districtDescAmber: {
    color: '#78350F',
    fontSize: 11,
  },
  districtAlertBoxGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  districtTitleGreen: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 12,
  },
  lowRiskText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 10,
  },

  // Doctors
  doctorsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  doctorsList: {
    gap: spacing.xs,
  },
  doctorCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  docCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  regBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  regBadgeText: {
    color: '#6B21A8',
    fontWeight: '700',
    fontSize: 9,
  },
  doctorNameText: {
    fontWeight: '800',
    fontSize: 13,
    color: '#0F172A',
  },
  doctorDegreesText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 11,
  },
  doctorHospitalText: {
    fontSize: 10,
  },
  docBookButton: {
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  docBookButtonText: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 11,
  },

  // Booking Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  bookingModalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedDocBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    fontWeight: '700',
    color: '#475569',
    fontSize: 11,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 50,
  },
  checkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  availBoxGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
  },
  availTitleGreen: {
    fontWeight: '800',
    color: '#065F46',
    fontSize: 12,
  },
  availDescGreen: {
    color: '#047857',
    fontSize: 11,
  },
  availBoxAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
  },
  availTitleAmber: {
    fontWeight: '800',
    color: '#92400E',
    fontSize: 12,
  },
  availDescAmber: {
    color: '#B45309',
    fontSize: 11,
  },
  confirmBookingButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBookingDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  confirmBookingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // Digital Pass Modal
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalPassCard: {
    backgroundColor: '#581C87',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  modalClinicName: {
    color: '#E9D5FF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },
  modalBigToken: {
    color: '#FBBF24',
    fontWeight: '900',
    fontSize: 48,
  },
  modalTokenDesc: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: spacing.xs,
  },
  modalInfoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  modalCloseButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
