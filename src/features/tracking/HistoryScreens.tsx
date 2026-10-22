import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { spacing, useThemeColors } from '@/theme/tokens';
import {
  analysisScore,
  loadAnalyses,
  loadLocations,
  type Analysis,
} from './backend';
import type { LocationSample } from './storage';

function useAccountRecords<T>(
  loader: (id: number, signal: AbortSignal) => Promise<T[]>,
) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    userId?: number;
    rows: T[];
    error: string | null;
    loading: boolean;
  }>({ rows: [], error: null, loading: true });
  useEffect(() => {
    const abort = new AbortController();
    if (userId == null) return;
    // Resolve asynchronously so effect setup remains free of synchronous state updates.
    void Promise.resolve().then(async () => {
      if (abort.signal.aborted) return;
      setResult({ userId, rows: [], error: null, loading: true });
      try {
        const rows = await loader(userId, abort.signal);
        if (!abort.signal.aborted)
          setResult({ userId, rows, error: null, loading: false });
      } catch (error) {
        if (!abort.signal.aborted)
          setResult({
            userId,
            rows: [],
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load records.',
            loading: false,
          });
      }
    });
    return () => abort.abort();
  }, [userId, attempt, loader]);
  return {
    ...result,
    rows: result.userId === userId ? result.rows : [],
    refresh: () => setAttempt((value) => value + 1),
  };
}

export function LocationHistoryScreen() {
  const { rows, loading, error, refresh } =
    useAccountRecords<LocationSample>(loadLocations);
  const [page, setPage] = useState(0);
  const colors = useThemeColors();
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / 20) - 1));
  return (
    <Screen withPattern>
      <AppText variant="title">Your location history</AppText>
      <AppText muted>
        Locations saved to your account. The server returns your latest 500
        records from the last 14 days. Pending device records appear in tracking
        status.
      </AppText>
      <AppButton label="Refresh history" loading={loading} onPress={refresh} />
      {error && (
        <AppText accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </AppText>
      )}
      {!loading && !error && !rows.length && (
        <AppCard>
          <AppText>No uploaded locations yet.</AppText>
          <AppText muted>
            Turn on tracking and upload pending records to see them here.
          </AppText>
        </AppCard>
      )}
      {rows.slice(current * 20, (current + 1) * 20).map((row) => (
        <AppCard key={row.client_record_id}>
          <AppText selectable>
            {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
          </AppText>
          <AppText>{new Date(row.recorded_at).toLocaleString()}</AppText>
          <AppText muted variant="caption">
            Reported accuracy: {Math.round(row.accuracy_m)} m · Saved to server
          </AppText>
        </AppCard>
      ))}
      {rows.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <AppText muted>
            Page {current + 1} of {Math.ceil(rows.length / 20)} · {rows.length}{' '}
            records returned
          </AppText>
          <AppButton
            label="Previous"
            disabled={current === 0}
            onPress={() => setPage(current - 1)}
          />
          <AppButton
            label="Next"
            disabled={(current + 1) * 20 >= rows.length}
            onPress={() => setPage(current + 1)}
          />
        </View>
      )}
    </Screen>
  );
}

function Summary({ summary }: { summary: Analysis['exposure_summary'] }) {
  if (typeof summary === 'string') return <AppText>{summary}</AppText>;
  if (!summary || typeof summary !== 'object')
    return <AppText muted>No summary available.</AppText>;
  const limitations = Array.isArray(summary.limitations)
    ? summary.limitations.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];
  return (
    <>
      {typeof summary.zone_observations_14d === 'number' && (
        <AppText>
          Risk-zone observations (14 days): {summary.zone_observations_14d}
        </AppText>
      )}
      {typeof summary.encounters_7d === 'number' && (
        <AppText>
          Proximity encounters (7 days): {summary.encounters_7d}
        </AppText>
      )}
      {summary.diagnosis_review_required === true && (
        <AppText>Diagnosis review required.</AppText>
      )}
      {limitations.map((text, index) => (
        <AppText muted variant="caption" key={index}>
          {text}
        </AppText>
      ))}
    </>
  );
}

export function ExposureAnalysisScreen() {
  const { rows, loading, error, refresh } =
    useAccountRecords<Analysis>(loadAnalyses);
  const colors = useThemeColors();
  return (
    <Screen withPattern>
      <AppText variant="title">Exposure analysis</AppText>
      <AppText muted>
        Existing summaries from your account. Uploading locations does not
        immediately calculate a score; server processing must run first.
      </AppText>
      <AppButton label="Refresh analysis" loading={loading} onPress={refresh} />
      {error && (
        <AppText accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </AppText>
      )}
      {!loading && !error && !rows.length && (
        <AppCard>
          <AppText variant="heading">Not calculated yet</AppText>
          <AppText muted>
            No analysis summaries are available for your account yet.
          </AppText>
        </AppCard>
      )}
      {rows.map((row) => (
        <AppCard key={row.id}>
          <AppText variant="heading">
            {row.disease_code.replace(/_/g, ' ')}
          </AppText>
          <AppText>{analysisScore(row.model_score)}</AppText>
          <AppText muted variant="caption">
            Updated: {new Date(row.analysed_at).toLocaleString()}
          </AppText>
          <Summary summary={row.exposure_summary} />
          {!!row.model_version && (
            <AppText muted variant="caption">
              Model: {row.model_version}
            </AppText>
          )}
        </AppCard>
      ))}
      <AppText muted>
        Missing observations or an uncalculated score do not mean there is no
        exposure. These summaries are not a diagnosis.
      </AppText>
    </Screen>
  );
}
