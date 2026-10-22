import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { useFocusEffect } from 'expo-router';
import { localDate, isBookableDate } from './booking';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import CareCard from '@/components/ui/CareCard';
import { useCareCardColors } from '@/theme/careCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiFetch } from '@/lib/api';
import { spacing, radius, useThemeColors } from '@/theme/tokens';

interface Doctor {
  doctor_id: string;
  register_id: string;
  doctors_name: string;
  degrees: string;
  working_hospital: string;
  is_available?: boolean;
  available_until?: string | null;
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

export function ChannelDoctorScreen() {
  const colors = useThemeColors();
  const cardTheme = useCareCardColors();
  const styles = createStyles(cardTheme, colors);
  const { session } = useAuth();
  const username = session?.user?.username || '';

  // Live Queue State from Backend
  const [queueData, setQueueData] = useState<QueueStatus | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState('');
  const [queueUnavailable, setQueueUnavailable] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);

  // Doctor Selection & Filter State
  const [selectedQueueDoctor, setSelectedQueueDoctor] = useState<Doctor | null>(
    null,
  );
  const [consultantFilter, setConsultantFilter] = useState<'all' | 'available'>(
    'all',
  );

  // Booking Modal State
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] =
    useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(localDate());
  const [bookingReason, setBookingReason] = useState('');
  const [availability, setAvailability] = useState<{
    checked: boolean;
    doctorId?: string;
    date?: string;
    available: boolean;
    doctor_name?: string;
    start_time?: string;
    end_time?: string;
    next_token?: string;
    message?: string;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Doctors Search
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsError, setDoctorsError] = useState('');
  const [doctorAttempt, setDoctorAttempt] = useState(0);
  const availabilityRequest = useRef(0);
  const bookingInFlight = useRef(false);
  const queueRequest = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const fetchLiveQueue = useCallback(async () => {
    const request = ++queueRequest.current;
    if (!username) {
      setLoadingQueue(false);
      return;
    }
    try {
      const data = await apiFetch(
        `/api/appointments/my-queue/?username=${encodeURIComponent(username)}`,
      );
      if (request !== queueRequest.current) return;
      if (typeof data?.has_appointment !== 'boolean')
        throw new Error('Invalid queue response');
      setQueueData(data);
      setQueueUnavailable(false);
      setQueueError('');
    } catch (error) {
      if (request !== queueRequest.current) return;
      const missing = (error as { status?: number })?.status === 404;
      setQueueUnavailable(missing);
      setQueueData(null);
      setQueueError(
        missing
          ? 'Live queue and appointment booking are not available yet.'
          : 'Unable to load your clinic queue. Check your connection and try again.',
      );
    } finally {
      if (request === queueRequest.current) setLoadingQueue(false);
    }
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      setQueueData(null);
      setQueueError('');
      setQueueUnavailable(false);
      setLoadingQueue(true);
      void fetchLiveQueue();
      const timer = setInterval(() => void fetchLiveQueue(), 30000);
      return () => {
        queueRequest.current++;
        clearInterval(timer);
      };
    }, [fetchLiveQueue]),
  );

  useEffect(
    () => () => {
      availabilityRequest.current++;
    },
    [],
  );

  // Load doctors from backend API
  useEffect(() => {
    let active = true;
    async function loadDoctors() {
      try {
        setLoadingDoctors(true);
        setDoctorsError('');
        const data = await apiFetch('/get-doctor/');
        if (!active) return;
        if (!Array.isArray(data?.doctors))
          throw new Error('Invalid doctor response');
        setDoctors(data.doctors);
        const live = data.doctors.find((d: Doctor) => d.is_available);
        setSelectedQueueDoctor(live || data.doctors[0] || null);
      } catch {
        if (active) {
          setDoctors([]);
          setSelectedQueueDoctor(null);
          setDoctorsError('Unable to load doctors. Please try again.');
        }
      } finally {
        if (active) setLoadingDoctors(false);
      }
    }
    void loadDoctors();
    return () => {
      active = false;
    };
  }, [doctorAttempt]);

  // Check Doctor Availability when modal opens or date changes
  const checkAvailability = async (docId: string, date: string) => {
    const request = ++availabilityRequest.current;
    setAvailability(null);
    if (!isBookableDate(date)) {
      setCheckingAvailability(false);
      setAvailability({
        checked: true,
        available: false,
        message: 'Enter a valid date (YYYY-MM-DD), today or later.',
      });
      return;
    }
    try {
      setCheckingAvailability(true);
      setAvailability(null);
      const res = await apiFetch(
        `/api/appointments/availability/?doctor_id=${encodeURIComponent(docId)}&date=${encodeURIComponent(date)}`,
      );
      if (request !== availabilityRequest.current) return;
      if (typeof res?.available !== 'boolean')
        throw new Error('Invalid availability response');
      if (res) {
        setAvailability({
          checked: true,
          available: res.available,
          doctorId: docId,
          date,
          doctor_name: res.doctor_name,
          start_time: res.start_time,
          end_time: res.end_time,
          next_token: res.next_token,
          message: res.message,
        });
        if (res.doctor_name) {
          setSelectedDoctorForBooking((prev) =>
            prev ? { ...prev, doctors_name: res.doctor_name } : prev,
          );
        }
      }
    } catch {
      if (request !== availabilityRequest.current) return;
      setAvailability({
        checked: true,
        available: false,
        message: 'Could not verify doctor schedule. Please try again.',
      });
    } finally {
      if (request === availabilityRequest.current)
        setCheckingAvailability(false);
    }
  };

  const handleOpenBooking = (doc: Doctor) => {
    if (
      !username ||
      queueUnavailable ||
      loadingQueue ||
      bookingInFlight.current
    )
      return;
    setSelectedDoctorForBooking(doc);
    const today = localDate();
    setBookingDate(today);
    setBookingReason('');
    setBookingModalVisible(true);
    checkAvailability(doc.doctor_id, today);
  };

  const handleConfirmBooking = async () => {
    if (
      !username ||
      !selectedDoctorForBooking ||
      !availability?.available ||
      checkingAvailability ||
      bookingInFlight.current ||
      !isBookableDate(bookingDate) ||
      availability.doctorId !== selectedDoctorForBooking.doctor_id ||
      availability.date !== bookingDate
    )
      return;
    bookingInFlight.current = true;

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

      if (!res?.appointment)
        throw new Error(
          'The server did not confirm your appointment. Check your queue before trying again.',
        );
      if (res.appointment) {
        setBookingModalVisible(false);
        await fetchLiveQueue();
        Alert.alert(
          'Queue Token Confirmed! 🎉',
          `Your queue token is ${res.appointment.token_label}.\n\nDoctor: ${res.appointment.doctor_name}\nTime: ${res.appointment.session_start_time || 'Not provided'}\nEstimated Wait: ${res.appointment.estimated_wait_minutes || 0} mins`,
          [
            {
              text: 'View Queue Pass',
              onPress: () => setPassModalVisible(true),
            },
          ],
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Booking Notice',
        err?.message || 'Could not complete booking. Please try again.',
      );
    } finally {
      bookingInFlight.current = false;
      setBookingSubmitting(false);
    }
  };

  const activeQueueDoctor =
    selectedQueueDoctor || doctors.find((d) => d.is_available) || doctors[0];

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

  const activeAppt = queueData?.has_appointment
    ? queueData.appointment
    : undefined;
  const closeBooking = () => {
    if (bookingInFlight.current) return;
    availabilityRequest.current++;
    setBookingModalVisible(false);
  };

  return (
    <Screen withPattern>
      <AppText
        variant="heading"
        style={{ color: colors.text, textAlign: 'center' }}
      >
        Channel a Doctor
      </AppText>
      <AppText muted style={{ color: colors.secondary, textAlign: 'center' }}>
        Find a doctor, book a visit and follow your clinic queue.
      </AppText>
      {loadingQueue && (
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel="Loading clinic queue"
        />
      )}
      {/* ========================================================================= */}
      {/* 2. LIVE CLINIC QUEUE STATUS CARD (Real Backend Data)                       */}
      {/* ========================================================================= */}
      {queueError ? (
        <CareCard
          tone="blue"
          contentStyle={[
            styles.card,
            { padding: spacing.md + spacing.lg, gap: spacing.md },
          ]}
        >
          <AppText
            variant="heading"
            style={{ color: colors.primary, textAlign: 'center' }}
          >
            Queue unavailable
          </AppText>
          <AppText
            accessibilityRole="alert"
            style={{ color: colors.secondary, textAlign: 'center' }}
          >
            {queueError}
          </AppText>
          {!queueUnavailable && (
            <Pressable
              accessibilityRole="button"
              onPress={fetchLiveQueue}
              style={styles.docBookButton}
            >
              <AppText style={styles.docBookButtonText}>Try again</AppText>
            </Pressable>
          )}
        </CareCard>
      ) : !loadingQueue ? (
        <CareCard
          tone="blue"
          style={{ borderRadius: radius.lg }}
          contentStyle={styles.queueCard}
        >
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
                {activeAppt
                  ? `Date: ${activeAppt.appointment_date}`
                  : 'Not Booked'}
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
                {activeAppt ? activeAppt.current_serving_token : '--'}
              </AppText>
              <AppText variant="caption" style={styles.queueTileSubTextLight}>
                {activeAppt
                  ? `${activeAppt.patients_ahead} ahead`
                  : 'Queue idle'}
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
            <View
              style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 4 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: cardTheme.supporting,
                    fontWeight: '800',
                    fontSize: 11,
                    letterSpacing: 0.5,
                  }}
                >
                  SELECT DOCTOR TO CONSULT:
                </AppText>
                <View
                  style={{
                    backgroundColor: '#22C55E25',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#22C55E50',
                  }}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: '#4ADE80',
                      fontWeight: '800',
                      fontSize: 10,
                    }}
                  >
                    {doctors.filter((d) => d.is_available).length} DOCTORS LIVE
                  </AppText>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {doctors.map((doc) => {
                  const isSelected =
                    activeQueueDoctor?.doctor_id === doc.doctor_id;
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
                        backgroundColor: isSelected
                          ? colors.surface
                          : '#3B076470',
                        borderWidth: 1.5,
                        borderColor: isSelected
                          ? '#C084FC'
                          : doc.is_available
                            ? '#22C55E60'
                            : '#145DA0',
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: doc.is_available
                            ? '#22C55E'
                            : '#94A3B8',
                        }}
                      />
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? colors.primary : '#FFFFFF',
                        }}
                      >
                        {doc.doctors_name}
                      </AppText>
                      {doc.is_available ? (
                        <View
                          style={{
                            backgroundColor: isSelected
                              ? colors.successSurface
                              : colors.successButton,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                            borderRadius: 6,
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: isSelected
                                ? colors.successText
                                : '#FFFFFF',
                            }}
                          >
                            LIVE
                          </AppText>
                        </View>
                      ) : (
                        <AppText
                          style={{
                            fontSize: 9,
                            color: isSelected ? colors.secondary : '#A855F7',
                            fontWeight: '500',
                          }}
                        >
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
                <Ionicons
                  name="medkit-outline"
                  size={18}
                  color={cardTheme.accents.blue}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.queueDoctorName}>
                  {activeAppt
                    ? activeAppt.doctor_name
                    : activeQueueDoctor?.is_available
                      ? `${activeQueueDoctor.doctors_name} is Online`
                      : `${activeQueueDoctor?.doctors_name || 'Doctor'} is Offline`}
                </AppText>
                <AppText variant="caption" style={styles.queueRoomText}>
                  {activeAppt
                    ? activeAppt.hospital_name || 'Colombo Outpatient Clinic'
                    : activeQueueDoctor?.is_available
                      ? `Available until ${activeQueueDoctor.available_until || '05:00 PM'} • Tap Book Token`
                      : 'Currently not accepting appointments'}
                </AppText>
              </View>
            </View>

            {activeAppt ? (
              <Pressable
                style={styles.viewPassButton}
                onPress={() => setPassModalVisible(true)}
              >
                <AppText style={styles.viewPassButtonText}>
                  Digital Pass
                </AppText>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={cardTheme.accents.blue}
                />
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.viewPassButton,
                  !activeQueueDoctor?.is_available && { opacity: 0.6 },
                ]}
                disabled={!activeQueueDoctor || !username}
                onPress={() => {
                  if (activeQueueDoctor) handleOpenBooking(activeQueueDoctor);
                }}
              >
                <AppText style={styles.viewPassButtonText}>
                  {activeQueueDoctor ? 'Book Token' : 'No doctors available'}
                </AppText>
                <Ionicons name="add" size={14} color={cardTheme.accents.blue} />
              </Pressable>
            )}
          </View>
        </CareCard>
      ) : null}

      {/* 5. FIND MEDICAL CONSULTANTS & LIVE QUEUE BOOKING                          */}
      {/* ========================================================================= */}
      <CareCard
        tone="blue"
        contentStyle={[
          styles.card,
          { padding: spacing.md + spacing.lg, gap: spacing.md },
        ]}
      >
        <View style={styles.doctorsHeaderRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.iconSquareBlue}>
              <Ionicons
                name="medkit-outline"
                size={18}
                color={cardTheme.accents.blue}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading" style={styles.sectionHeading}>
                Find Medical Consultants
              </AppText>
              <AppText variant="caption" muted style={{ textAlign: 'center' }}>
                Select doctor & book an official queue token
              </AppText>
            </View>
          </View>
        </View>

        {/* Available Filter Toggle Tabs */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginVertical: 10,
          }}
        >
          <Pressable
            onPress={() => setConsultantFilter('all')}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor:
                consultantFilter === 'all' ? colors.button : colors.subtle,
            }}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: '700',
                color:
                  consultantFilter === 'all' ? '#FFFFFF' : colors.secondary,
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
              backgroundColor:
                consultantFilter === 'available'
                  ? colors.successButton
                  : colors.successSurface,
              borderWidth: 1,
              borderColor: '#86EFAC',
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor:
                  consultantFilter === 'available'
                    ? '#FFFFFF'
                    : colors.successText,
              }}
            />
            <AppText
              style={{
                fontSize: 12,
                fontWeight: '800',
                color:
                  consultantFilter === 'available'
                    ? '#FFFFFF'
                    : colors.successText,
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

        {doctorsError ? (
          <View>
            <AppText accessibilityRole="alert">{doctorsError}</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDoctorAttempt((value) => value + 1)}
            >
              <AppText>Retry loading doctors</AppText>
            </Pressable>
          </View>
        ) : !loadingDoctors && filteredDoctors.length === 0 ? (
          <AppText>No doctors match your search or filter.</AppText>
        ) : null}
        {/* Doctors List */}
        {loadingDoctors ? (
          <ActivityIndicator
            color={cardTheme.accents.blue}
            style={{ marginVertical: 20 }}
          />
        ) : (
          <View style={styles.doctorsList}>
            {filteredDoctors.map((doc) => (
              <CareCard
                tone="blue"
                key={doc.doctor_id}
                style={{ borderRadius: radius.md }}
                contentStyle={styles.doctorCard}
              >
                <View style={styles.docCardTop}>
                  <View style={styles.docAvatar}>
                    <AppText style={styles.docAvatarText}>DR</AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {doc.is_available ? (
                      <View
                        style={{
                          backgroundColor: colors.successSurface,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#86EFAC',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: colors.successText,
                          }}
                        />
                        <AppText
                          variant="caption"
                          style={{
                            color: colors.successText,
                            fontWeight: '700',
                            fontSize: 10,
                          }}
                        >
                          Online{' '}
                          {doc.available_until
                            ? `(${doc.available_until})`
                            : ''}
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
                <AppText
                  variant="caption"
                  muted
                  style={styles.doctorHospitalText}
                >
                  {doc.working_hospital}
                </AppText>

                <Pressable
                  style={[
                    styles.docBookButton,
                    doc.is_available && {
                      backgroundColor: colors.successButton,
                    },
                  ]}
                  disabled={queueUnavailable || loadingQueue}
                  accessibilityState={{
                    disabled: queueUnavailable || loadingQueue,
                  }}
                  onPress={() => handleOpenBooking(doc)}
                >
                  <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                  <AppText style={styles.docBookButtonText}>
                    {queueUnavailable
                      ? 'Booking unavailable'
                      : loadingQueue
                        ? 'Checking booking service...'
                        : doc.is_available
                          ? 'Book Queue Token (Live)'
                          : 'Book Queue Token'}
                  </AppText>
                </Pressable>
              </CareCard>
            ))}
          </View>
        )}
      </CareCard>

      {/* ========================================================================= */}
      {/* 6. APPOINTMENT QUEUE BOOKING MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeBooking}
      >
        <Pressable style={styles.modalOverlay} onPress={closeBooking}>
          <Pressable
            style={styles.bookingModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <AppText variant="heading" style={styles.modalTitle}>
                  Book Queue Token
                </AppText>
                <AppText variant="caption" muted>
                  Verified appointment through clinic queue
                </AppText>
              </View>
              <Pressable onPress={closeBooking}>
                <Ionicons
                  name="close-circle"
                  size={26}
                  color={colors.secondary}
                />
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
                    {selectedDoctorForBooking.degrees} •{' '}
                    {selectedDoctorForBooking.working_hospital}
                  </AppText>
                </View>
              </View>
            )}

            {/* Quick Doctor Switcher inside Modal */}
            <View style={{ marginBottom: 14 }}>
              <AppText
                variant="caption"
                style={{
                  fontWeight: '700',
                  color: colors.secondary,
                  marginBottom: 6,
                  fontSize: 11,
                  textTransform: 'uppercase',
                }}
              >
                Switch Doctor:
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {doctors.map((doc) => {
                  const isCur =
                    selectedDoctorForBooking?.doctor_id === doc.doctor_id;
                  return (
                    <Pressable
                      key={doc.doctor_id}
                      onPress={() => {
                        if (bookingInFlight.current) return;
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
                        backgroundColor: isCur ? colors.button : colors.subtle,
                        borderWidth: 1,
                        borderColor: isCur
                          ? '#145DA0'
                          : doc.is_available
                            ? '#86EFAC'
                            : '#DCE7F2',
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isCur
                            ? '#FFFFFF'
                            : doc.is_available
                              ? colors.successText
                              : '#94A3B8',
                        }}
                      />
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: isCur ? '800' : '600',
                          color: isCur ? '#FFFFFF' : colors.text,
                        }}
                      >
                        {doc.doctors_name}
                      </AppText>
                      {doc.is_available && (
                        <AppText
                          style={{
                            fontSize: 9,
                            fontWeight: '700',
                            color: isCur ? '#A7F3D0' : colors.successText,
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
                <Ionicons
                  name="calendar"
                  size={16}
                  color={cardTheme.accents.blue}
                />
                <TextInput
                  editable={!bookingSubmitting}
                  value={bookingDate}
                  onChangeText={(text) => {
                    setBookingDate(text);
                    if (selectedDoctorForBooking) {
                      checkAvailability(
                        selectedDoctorForBooking.doctor_id,
                        text,
                      );
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
                <ActivityIndicator
                  size="small"
                  color={cardTheme.accents.blue}
                />
                <AppText variant="caption" muted>
                  Checking doctor consultation schedule...
                </AppText>
              </View>
            ) : availability ? (
              availability.available ? (
                <View style={styles.availBoxGreen}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.successText}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.availTitleGreen}>
                      Doctor Available on Selected Date
                    </AppText>
                    <AppText variant="caption" style={styles.availDescGreen}>
                      Hours: {availability.start_time} - {availability.end_time}{' '}
                      • Next Token: {availability.next_token}
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
                      {availability.message ||
                        'The doctor has not scheduled consultation hours on this date.'}
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
                editable={!bookingSubmitting}
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
                (!availability?.available ||
                  checkingAvailability ||
                  bookingSubmitting) &&
                  styles.confirmBookingDisabled,
              ]}
              disabled={
                !availability?.available ||
                checkingAvailability ||
                bookingSubmitting
              }
              onPress={handleConfirmBooking}
            >
              {bookingSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText style={styles.confirmBookingText}>
                  {availability?.available
                    ? 'Confirm & Get Queue Token'
                    : 'Doctor Unavailable on Selected Date'}
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
        visible={passModalVisible && !!activeAppt}
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
                <Ionicons name="close" size={22} color={colors.secondary} />
              </Pressable>
            </View>

            <CareCard
              tone="blue"
              style={{ borderRadius: radius.md }}
              contentStyle={styles.modalPassCard}
            >
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
                <AppText variant="caption" muted>
                  Consultant:
                </AppText>
                <AppText variant="caption" style={{ fontWeight: '700' }}>
                  {activeAppt ? activeAppt.doctor_name : 'Dr. Priyantha Perera'}
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>
                  Date:
                </AppText>
                <AppText variant="caption" style={{ fontWeight: '700' }}>
                  {activeAppt?.appointment_date || 'Today'}
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>
                  Session Time:
                </AppText>
                <AppText variant="caption" style={{ fontWeight: '700' }}>
                  {activeAppt?.session_start_time || 'Not provided'}
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>
                  Now Calling:
                </AppText>
                <AppText
                  variant="caption"
                  style={{ fontWeight: '700', color: colors.warningText }}
                >
                  {activeAppt?.current_serving_token || '#01'} (
                  {activeAppt?.patients_ahead || 0} Ahead)
                </AppText>
              </View>
              <View style={styles.modalInfoRow}>
                <AppText variant="caption" muted>
                  Est. Turn:
                </AppText>
                <AppText
                  variant="caption"
                  style={{ fontWeight: '700', color: colors.successText }}
                >
                  {activeAppt?.estimated_time || 'Not provided'} (~
                  {activeAppt?.estimated_wait_minutes || 0} mins)
                </AppText>
              </View>
            </CareCard>

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

export default ChannelDoctorScreen;

const createStyles = (
  cardTheme: ReturnType<typeof useCareCardColors>,
  colors: ReturnType<typeof useThemeColors>,
) =>
  StyleSheet.create({
    queueCard: { padding: spacing.md, gap: spacing.md },
    queueHeader: {
      flexWrap: 'wrap',
      gap: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: cardTheme.border,
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
      color: cardTheme.heading,
      fontWeight: '800',
      fontSize: 11,
      letterSpacing: 0.8,
    },
    activeConsultBadge: {
      backgroundColor: cardTheme.subtle,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    activeConsultText: {
      color: cardTheme.heading,
      fontWeight: '700',
      fontSize: 10,
    },
    queueMetricsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    queueTile: {
      flex: 1,
      backgroundColor: cardTheme.subtle,
      borderWidth: 1,
      borderColor: cardTheme.border,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    queueTileHighlight: {
      backgroundColor: cardTheme.subtle,
      borderColor: 'rgba(251, 191, 36, 0.5)',
    },
    queueTileLabel: {
      color: cardTheme.supporting,
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
      color: cardTheme.supporting,
      fontWeight: '800',
      fontSize: 10,
      textTransform: 'uppercase',
    },
    queueTileBigValue: {
      color: cardTheme.heading,
      fontWeight: '900',
      fontSize: 24,
    },
    queueTileBigValueAmber: {
      color: cardTheme.heading,
      fontWeight: '900',
      fontSize: 24,
    },
    queueTileSubTextGreen: {
      color: cardTheme.supporting,
      fontWeight: '700',
      fontSize: 10,
    },
    queueTileSubTextLight: {
      color: cardTheme.supporting,
      fontSize: 10,
    },
    queueFooter: {
      flexWrap: 'wrap',
      borderTopWidth: 1,
      borderTopColor: cardTheme.border,
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
      backgroundColor: cardTheme.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueDoctorName: {
      color: cardTheme.heading,
      fontWeight: '800',
      fontSize: 12,
    },
    queueRoomText: {
      color: cardTheme.supporting,
      fontSize: 10,
    },
    viewPassButton: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewPassButtonText: {
      color: cardTheme.accents.blue,
      fontWeight: '800',
      fontSize: 11,
    },

    card: { padding: spacing.md, gap: spacing.sm },
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
      backgroundColor: colors.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeading: {
      fontSize: 15,
      fontWeight: '800',
      color: cardTheme.heading,
    },
    doctorsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
      height: 42,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: cardTheme.heading,
    },
    doctorsList: {
      gap: spacing.xs,
    },
    doctorCard: { padding: spacing.sm, gap: 4 },
    docCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    docAvatar: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    docAvatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 11,
    },
    regBadge: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
    },
    regBadgeText: {
      color: cardTheme.accents.blue,
      fontWeight: '700',
      fontSize: 9,
    },
    doctorNameText: {
      fontWeight: '800',
      fontSize: 13,
      color: cardTheme.heading,
    },
    doctorDegreesText: {
      color: cardTheme.accents.blue,
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
      backgroundColor: colors.button,
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
      backgroundColor: colors.surface,
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
      color: cardTheme.heading,
    },
    selectedDocBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      borderRadius: radius.md,
    },
    fieldBlock: {
      gap: 4,
    },
    fieldLabel: {
      fontWeight: '700',
      color: colors.secondary,
      fontSize: 11,
    },
    dateInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
      height: 40,
    },
    dateTextInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: cardTheme.heading,
    },
    reasonInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.sm,
      fontSize: 12,
      color: cardTheme.heading,
      minHeight: 50,
    },
    checkingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      backgroundColor: colors.subtle,
      borderRadius: 8,
    },
    availBoxGreen: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      backgroundColor: colors.successSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    availTitleGreen: {
      fontWeight: '800',
      color: colors.successText,
      fontSize: 12,
    },
    availDescGreen: {
      color: colors.successText,
      fontSize: 11,
    },
    availBoxAmber: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      backgroundColor: colors.warningSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    availTitleAmber: {
      fontWeight: '800',
      color: colors.warningText,
      fontSize: 12,
    },
    availDescAmber: {
      color: colors.warningText,
      fontSize: 11,
    },
    confirmBookingButton: {
      backgroundColor: colors.button,
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
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalPassCard: { padding: spacing.md, alignItems: 'center', gap: 4 },
    modalClinicName: {
      color: cardTheme.supporting,
      fontWeight: '800',
      fontSize: 10,
      letterSpacing: 1,
    },
    modalBigToken: {
      color: cardTheme.heading,
      fontWeight: '900',
      fontSize: 48,
    },
    modalTokenDesc: {
      color: cardTheme.heading,
      fontWeight: '700',
      fontSize: 12,
    },
    modalDivider: {
      width: '100%',
      height: 1,
      backgroundColor: cardTheme.subtle,
      marginVertical: spacing.xs,
    },
    modalInfoRow: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    modalCloseButton: {
      backgroundColor: colors.button,
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
