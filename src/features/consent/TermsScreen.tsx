import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { spacing, radius, useThemeColors } from '@/theme/tokens';
import { useConsentController, useConsentState } from './ConsentProvider';
import type { ConsentController } from './controller';
import { documentAvailable, researchAvailable, type Document } from './model';

function Choice({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={onChange}
      style={({ pressed }) => [
        styles.choice,
        { borderColor: colors.border, backgroundColor: colors.surface },
        (disabled || pressed) && { opacity: 0.6 },
      ]}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={26}
        color={colors.primary}
      />
      <View style={styles.choiceText}>
        <AppText style={{ fontWeight: '600' }}>{label}</AppText>
        <AppText muted variant="caption">
          {description}
        </AppText>
      </View>
    </Pressable>
  );
}

function DocumentText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((paragraph, index) => {
        const heading = /^\*\*[^*]+\*\*$/.test(paragraph.trim());
        return (
          <AppText
            key={index}
            selectable
            variant={heading ? 'heading' : 'body'}
            accessibilityRole={heading ? 'header' : undefined}
          >
            {paragraph.replace(/\*\*/g, '')}
          </AppText>
        );
      })}
    </>
  );
}

function SupportingDocument({
  title,
  document,
}: {
  title: string;
  document: Document;
}) {
  const [error, setError] = useState(false);
  return (
    <AppCard>
      <AppText variant="heading">
        {title} · {document.version}
      </AppText>
      {document.text && <DocumentText text={document.text} />}
      {document.url && (
        <AppButton
          label={`Open ${title}`}
          onPress={() => {
            setError(false);
            void Linking.openURL(document.url!).catch(() => setError(true));
          }}
        />
      )}
      {error && (
        <AppText accessibilityRole="alert">
          The document could not be opened. Try again before acknowledging it.
        </AppText>
      )}
    </AppCard>
  );
}

export function TermsScreen({ manage = false }: { manage?: boolean }) {
  const controller = useConsentController();
  return controller ? (
    <ConsentForm controller={controller} manage={manage} />
  ) : (
    <Screen>
      <AppText>Loading your choices…</AppText>
    </Screen>
  );
}

function ConsentForm({
  controller,
  manage,
}: {
  controller: ConsentController;
  manage: boolean;
}) {
  const state = useConsentState(controller);
  const { session } = useAuth();
  const docs = controller.documents;
  const [required, setRequired] = useState(
    manage && controller.requiredAccepted(),
  );
  const [tracking, setTracking] = useState(manage && controller.canTrack());
  const [research, setResearch] = useState(manage && controller.canResearch());
  const [showTerms, setShowTerms] = useState(!manage);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const privacyReady = documentAvailable(docs.privacy);
  const researchReady = researchAvailable(docs);
  const save = async () => {
    setMessage('');
    setError('');
    try {
      await controller.save({ required, tracking, research });
      setMessage(
        'Choices saved on this device. No device permissions were requested.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save choices.');
    }
  };
  const withdraw = async (kind: 'tracking' | 'research') => {
    setMessage('');
    setError('');
    if (kind === 'tracking') setTracking(false);
    else setResearch(false);
    try {
      await controller.withdraw(kind);
      setMessage(
        'Withdrawal saved on this device. Previously uploaded records have not been deleted.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save withdrawal.');
    }
  };
  return (
    <Screen
      withPattern
      edges={manage ? ['left', 'right'] : ['top', 'left', 'right', 'bottom']}
    >
      <AppText variant="title" accessibilityRole="header">
        Terms & consent
      </AppText>
      <AppText muted>
        {manage
          ? 'Review your documents and manage your choices.'
          : session
            ? `Review and accept for ${session.user.username}. Choices made before login are not automatically applied to your account.`
            : 'Before you continue, read the Terms and choose what you agree to.'}
      </AppText>
      <AppCard>
        <AppText variant="heading">Terms version {docs.terms.version}</AppText>
        <AppText muted>
          This draft contains placeholders for organisation and contact
          information. Features described in it may not yet be available.
        </AppText>
        <AppButton
          label={showTerms ? 'Hide Terms text' : 'Read Terms and Conditions'}
          onPress={() => setShowTerms(!showTerms)}
        />
        {showTerms && <DocumentText text={docs.terms.text} />}
      </AppCard>
      {privacyReady && docs.privacy ? (
        <SupportingDocument title="Privacy Notice" document={docs.privacy} />
      ) : (
        <AppCard>
          <AppText variant="heading">Privacy Notice not yet available</AppText>
          <AppText>
            You can accept the Terms and continue. No Privacy Notice
            acknowledgement will be recorded. Tracking consent is unavailable
            until the notice is provided.
          </AppText>
        </AppCard>
      )}
      {researchReady && docs.research && (
        <>
          <SupportingDocument
            title="Research Participant Information"
            document={docs.research}
          />
          <AppCard>
            <AppText>
              Research retention: {docs.research.retentionPeriod}
            </AppText>
            <AppText>Authorised recipients: {docs.research.recipients}</AppText>
          </AppCard>
        </>
      )}
      <AppText variant="heading">Your choices</AppText>
      <Choice
        label={
          privacyReady
            ? 'Required: I accept the Terms and acknowledge the Privacy Notice.'
            : 'Required: I accept the Terms and Conditions.'
        }
        description="Required to continue to registration, login and the app."
        checked={required}
        disabled={state.saving}
        onChange={() => setRequired(!required)}
      />
      <Choice
        label="Optional: background location/BLE tracking and health-report matching"
        description={
          privacyReady
            ? 'I consent to location and BLE collection and matching with verified positive health reports. Operational location and encounter history uses a rolling 14-day policy. Saving this choice does not start tracking.'
            : 'Unavailable until the Privacy Notice is configured. Other app features remain available.'
        }
        checked={tracking}
        disabled={state.saving || !privacyReady}
        onChange={() => setTracking(!tracking)}
      />
      <Choice
        label="Optional: research use and retention beyond 14 days"
        description={
          researchReady
            ? `I consent to research copying as described above. Research retention: ${docs.research!.retentionPeriod}. Declining does not block non-research features.`
            : 'Unavailable until research information, recipients and a defined retention period are provided. No research copying is authorised.'
        }
        checked={research}
        disabled={state.saving || !researchReady}
        onChange={() => setResearch(!research)}
      />
      <AppText muted>
        App consent and device permissions are separate. Location and Bluetooth
        permissions are requested only when you explicitly enable the relevant
        feature.
      </AppText>
      {(error || state.error) && (
        <AppText accessibilityRole="alert">{error || state.error}</AppText>
      )}
      {!!message && (
        <AppText accessibilityLiveRegion="polite">{message}</AppText>
      )}
      <AppButton
        label={manage ? 'Save choices' : 'Save choices and continue'}
        loading={state.saving}
        disabled={
          !state.ready || !required || (docs.privacy !== null && !privacyReady)
        }
        onPress={() => void save()}
      />
      {state.record?.tracking.granted && (
        <AppButton
          label="Withdraw tracking consent now"
          disabled={state.saving}
          onPress={() => void withdraw('tracking')}
        />
      )}
      {state.record?.research.granted && (
        <AppButton
          label="Withdraw research consent now"
          disabled={state.saving}
          onPress={() => void withdraw('research')}
        />
      )}
      <AppCard>
        <AppText variant="heading">Saved choices</AppText>
        <AppText>
          {session
            ? `For ${session.user.username} on this device.`
            : 'Before login, choices belong only to this device. After login, you will confirm choices for your account.'}
        </AppText>
        {state.record && (
          <>
            <AppText>
              Terms {state.record.terms.version} accepted:{' '}
              {new Date(state.record.terms.acceptedAt).toLocaleString()}
            </AppText>
            <AppText>
              Privacy Notice:{' '}
              {state.record.privacy
                ? `${state.record.privacy.version} acknowledged`
                : 'Not acknowledged'}
            </AppText>
            <AppText>
              Tracking:{' '}
              {state.record.tracking.granted
                ? 'Consent saved'
                : 'Not consented'}
            </AppText>
            <AppText>
              Research:{' '}
              {state.record.research.granted
                ? 'Consent saved'
                : 'Not consented'}
            </AppText>
            {state.record.tracking.withdrawnAt && (
              <AppText>
                Tracking withdrawn:{' '}
                {new Date(state.record.tracking.withdrawnAt).toLocaleString()}
              </AppText>
            )}
            {state.record.research.withdrawnAt && (
              <AppText>
                Research withdrawn:{' '}
                {new Date(state.record.research.withdrawnAt).toLocaleString()}
              </AppText>
            )}
          </>
        )}
        <AppText muted>
          These versioned choices are stored locally only. Account-wide consent
          syncing is not yet available. Withdrawal blocks new collection on this
          device; it does not confirm deletion or withdrawal on other devices or
          of previously uploaded data.
        </AppText>
      </AppCard>
      {!manage && session && <SignOutButton />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    minHeight: 48,
  },
  choiceText: { flex: 1, gap: spacing.xs },
});
