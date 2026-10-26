import type { ConsentDocuments } from './model';

// Owner-supplied draft. Preserve placeholders until approved replacements are
// provided, and bump the version whenever material wording changes.
export const consentDocuments: ConsentDocuments = {
  terms: {
    version: '1.0',
    text: `**MediTrack — Terms and Conditions**

**Version:** 1.0  
**Effective date:** [Date]  
**Operated by:** [Responsible organisation or research institution]  
**Contact:** [Support and privacy email]

**1. About MediTrack**

MediTrack supports health monitoring, medication and recovery management, and the recording of possible proximity encounters between registered users. Relevant encounter information may be linked to recorded positive disease reports and made available to authorised healthcare professionals.

Some features are experimental or research-based. Available features may differ between devices and operating systems.

**2. Acceptance and eligibility**

By selecting “I agree to the Terms and Conditions,” you agree to these Terms. If you do not agree, do not proceed with registration or use the service.

You must provide accurate registration information and keep your account credentials secure. Do not use another person’s account or submit false health information.

For the initial research release, participation is restricted to adults aged 18 or over. Participation by minors requires a separately approved consent and safeguarding process.

**3. Medical limitations**

MediTrack does not replace professional medical assessment, diagnosis, or treatment. Recovery estimates, automated outputs, and proximity alerts may be incomplete or inaccurate.

A proximity encounter does not establish that an infection occurred. An absence of recorded encounters does not establish that you are free from exposure or illness.

Do not change or stop prescribed treatment solely because of information displayed by the app. The app is not an emergency service or a continuously monitored medical service.

**4. Location and Bluetooth tracking**

If you separately enable proximity tracking and grant the required device permissions, MediTrack collects:

- Precise location coordinates, timestamps, and available location accuracy information.
- Bluetooth Low Energy identifiers and signal-strength observations.
- Estimated encounter start times, end times, and durations.

Location collection targets approximately one update per minute. Collection may continue while the app is not visible or the screen is locked, subject to operating-system restrictions.

Tracking depends on permissions, device settings, Bluetooth and location availability, battery conditions, and operating-system behaviour. It may stop or be delayed. Installing the app or logging in does not guarantee continuous tracking.

Tracking may increase battery and mobile-data usage. Records collected while offline may be stored on the device and uploaded when connectivity returns.

**5. Encounter detection and health-report matching**

MediTrack uses GPS and Bluetooth observations to estimate whether participating devices were near each other. It does not establish that users met face to face, and the initial implementation does not distinguish walls or building floors.

When a positive health report is recorded and accepted through the system’s verification process, the service may compare it with encounter records within its configured 14-day history.

The resulting record indicates a possible encounter associated with a positive report. It is not a diagnosis or a confirmed transmission event. The 14-day history is a system setting, not a statement that every disease has the same infectious period.

**6. Access by healthcare professionals**

Authorised healthcare professionals involved in your care may view relevant encounter dates, estimated durations, associated disease information, and review status.

Other users do not receive unrestricted access to your location history or medical records. Access to identifiable information about another participant must be limited to authorised purposes described in the Privacy Notice.

**7. Operational data retention**

Operational location and encounter histories are maintained on a rolling 14-day basis. As a new day begins, records for the oldest day are scheduled for deletion.

This cleanup does not automatically delete your account, medical records, or exposure information already included in a clinical review. Retention periods for those records, local copies, and backups are specified in the Privacy Notice: [Privacy Notice link].

If you separately agree to research participation, research copies follow the research retention terms below rather than the operational 14-day cleanup.

**8. Optional research participation**

Research participation requires separate, optional consent. Accepting these Terms alone does not authorise copying your data into the research database.

With your research consent, the data categories listed in the Research Participant Information Sheet may be copied to a separate database for developing and evaluating MediTrack’s detection and analytical methods.

These copies may include precise location histories, encounter observations, and linked health outcomes where explicitly disclosed. They are not deleted by the operational 14-day cleanup.

**Research retention period:** [Specify a defined period or end date].  
**Authorised research recipients:** [Specify research team and institution].  
**Research information:** [Participant Information Sheet link].

Research identifiers may replace direct identifiers, but detailed location histories can still identify individuals. Such data must not be described as fully anonymous merely because names have been removed.

Declining research participation does not prevent access to non-research features otherwise available to you.

**9. Your choices and withdrawal**

You may disable tracking in the app or revoke device permissions. This stops future tracking collection but does not automatically erase previously uploaded records.

You may withdraw research consent through [in-app control or contact]. Withdrawal stops future research copying. The Participant Information Sheet explains how existing identifiable research copies are handled and any applicable retention requirements.

Data already irreversibly anonymised or included in non-identifying aggregate results may no longer be identifiable for removal.

You may contact [privacy email] to request access, correction, or deletion of your information, or to raise a privacy concern. Applicable exceptions and response procedures are described in the Privacy Notice.

**10. Responsible use**

You must not use MediTrack to stalk, monitor, or identify another person without authorisation; falsify encounter or health records; access another user’s data; or interfere with the service.

Access may be restricted where reasonably necessary to address misuse or protect users. This does not remove applicable rights concerning your personal information.

**11. Privacy and service providers**

The Privacy Notice identifies the organisation responsible for your data, the service providers involved, hosting locations, any international transfers, security arrangements, and retention practices.

No digital service can guarantee absolute security or uninterrupted availability. Material incidents will be handled under applicable obligations and the procedures described in the Privacy Notice.

**12. Changes and contact**

Material changes to these Terms will be communicated through the app or your registered contact details. Where a new data use requires consent, we will request it separately before that use begins.

Nothing in these Terms excludes rights or responsibilities that cannot lawfully be excluded.

For support, privacy requests, or complaints, contact:  
[Organisation name]  
[Contact email]  
[Postal address]`,
  },
  // Deferred explicitly by the owner: no Privacy acknowledgement is fabricated.
  // Configuring this later requires acknowledgement, even if Terms stay at 1.0.
  privacy: null,
  // Configure version, text (or HTTPS URL), retentionPeriod and recipients together.
  research: null,
};
