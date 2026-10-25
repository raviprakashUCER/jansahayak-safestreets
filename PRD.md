# PRD: Automated Citizen Report Processing, Evidence Analysis, Geolocation and Map Publication

**Product:** JanSahayak SafeStreets  
**Module:** Automated Report Processing Pipeline  
**Document type:** Product and Engineering Requirements  
**Priority:** Critical  
**Implementation objective:** Build a resilient, asynchronous pipeline that automatically validates submitted evidence, analyses images using AI, verifies the incident location, detects duplicate reports, resolves incident associations and publishes approved incidents to the public map.

---

## 1. Product objective

Implement an end-to-end automated pipeline that processes a citizen's road-safety report from submission through evidence analysis, location verification, incident matching, approval and map publication.

The system must automate every processing stage that can be reliably automated. Human intervention is permitted only where required by configured business rules, insufficient evidence, ambiguous AI predictions, moderation policies or operational failures.

The system must never publish a report or incident when a required processing stage has failed, has not completed, or has produced an invalid result.

### Core principles

1. Fail closed: incomplete processing cannot produce a public map pin.
2. Preserve evidence: processing failures must not destroy original reports or uploaded evidence.
3. Idempotent execution: retries must not create duplicate incidents, merges, map pins or notifications.
4. Evidence-first decisions: AI predictions must be supported by recorded evidence and confidence information.
5. Strict automatic merging: automatically merge only calibrated high-confidence matches that pass every hard rule.
6. Human-review fallback: uncertain or contradictory cases must enter an appropriate review queue.
7. Transactional publication: public incident visibility and canonical map-pin creation must happen atomically from the application's perspective.
8. Full auditability: every stage, decision, failure, retry, override and publication must be traceable.
9. Privacy by default: private user data, raw device metadata and unnecessary precise location information must not be exposed publicly.
10. Recoverability: infrastructure failures must result in retries or explicit failed states, never silent data loss.

## 2. Scope

### Included

- Authenticated report submission.
- In-app camera evidence capture integration.
- Minimum four valid evidence photographs.
- Capture-time GPS sampling and location-quality validation.
- Secure evidence upload and storage.
- AI image-quality assessment and hazard classification.
- Image embeddings and duplicate-image detection.
- Candidate incident discovery using geospatial queries.
- Image, location, category, temporal and defect-context matching.
- Strict automatic merge eligibility.
- Manual merge and incident-boundary review.
- Evidence-based representative incident location calculation.
- Continuous road-defect segmentation suggestions.
- Moderation and approval workflow.
- Canonical incident creation and public map publication.
- Automatic retries, failure handling and operational monitoring.
- Audit logs, notifications and automated tests.

### Excluded from this module

- Automatic government-authority escalation.
- Authority performance scoring.
- Citizen resolution voting.
- Final repair verification.
- Government-system integrations unless explicitly configured and independently verified.

These later workflows must consume the canonical incident created by this pipeline without weakening its validation or publication requirements.

## 3. User workflow

1. A citizen creates an account and starts a report.
2. The citizen selects a problem category and enters a description.
3. The citizen captures at least four photographs using the in-app camera.
4. The application samples device location at each capture and associates it with the corresponding evidence record.
5. The citizen submits the report.
6. The backend creates a durable report record and a processing job.
7. The pipeline validates evidence and location data.
8. AI analyses the evidence and extracts structured attributes.
9. The system calculates a report-level location estimate.
10. The system searches for candidate incidents and evaluates duplicate matches.
11. A qualifying high-confidence duplicate may be merged automatically; uncertain cases enter review.
12. A new incident candidate is created when no eligible duplicate exists.
13. The system calculates the canonical incident location and spatial extent.
14. The configured moderation policy determines whether human approval is required.
15. Only an eligible, approved incident is published to the public map.
16. The system records publication, updates the report status and notifies the citizen.

The application must expose processing progress to the submitting user without exposing internal model prompts, private evidence or sensitive moderation data.

## 4. Processing architecture

Use a durable, asynchronous job-processing architecture.

Recommended logical components:

- Report API: validates and accepts submissions.
- Evidence service: handles secure image storage and metadata.
- Processing orchestrator: manages stage transitions and dependencies.
- Validation worker: validates files, capture records and evidence quality.
- AI analysis worker: performs image analysis and structured extraction.
- Geospatial worker: calculates representative locations and finds nearby incidents.
- Matching worker: ranks candidates and evaluates merge eligibility.
- Incident service: manages canonical incidents and associations.
- Moderation service: handles manual review and approval.
- Publication service: exposes eligible incidents to the public map.
- Notification worker: sends user notifications after committed state changes.
- Audit service: records immutable decision history.

Use a durable queue or job system supported by the existing project stack. If Redis and a queue library are used, queue messages must not become the sole source of truth for processing state.

Persist job state in PostgreSQL. Use transactional outbox patterns or equivalent mechanisms to reliably dispatch jobs after database transactions commit.

The implementation must follow the repository's existing architecture and dependencies where suitable rather than adding unnecessary infrastructure.

## 5. State machine

Implement explicit, validated state transitions.

Suggested report processing states:

- `DRAFT`
- `SUBMITTED`
- `EVIDENCE_VALIDATION_PENDING`
- `EVIDENCE_VALIDATION_FAILED`
- `EVIDENCE_VALIDATED`
- `AI_ANALYSIS_PENDING`
- `AI_ANALYSIS_FAILED`
- `LOCATION_VERIFICATION_PENDING`
- `LOCATION_VERIFICATION_FAILED`
- `MATCHING_PENDING`
- `MATCH_REVIEW_REQUIRED`
- `INCIDENT_ASSOCIATION_PENDING`
- `INCIDENT_ASSOCIATED`
- `MODERATION_PENDING`
- `ADDITIONAL_EVIDENCE_REQUIRED`
- `APPROVED`
- `REJECTED`
- `PUBLICATION_PENDING`
- `PUBLISHED`
- `PROCESSING_RETRY_PENDING`
- `PROCESSING_FAILED`

These states represent different concerns and may be normalized into separate report, processing-job, moderation and publication state machines during implementation. Do not create one unbounded status enum if separate entities provide better consistency.

### Transition requirements

- A transition must be validated server-side.
- Only authorized services and users may execute a transition.
- A failed stage must not advance to a later mandatory stage.
- A retryable failure must retain its original failure information.
- A terminal moderation rejection must never publish the incident.
- Additional evidence requests must block publication until the required evidence is provided and validated.
- A manual review requirement must not be interpreted as a successful automatic decision.
- Reprocessing must use explicit transition rules and must not silently erase prior decisions.
- A published incident must have a valid canonical location, valid evidence references, a valid incident association and an approved publication record.

## 6. Stage 1: Report submission

### Requirements

- Require an authenticated user.
- Validate problem category, description and required form fields.
- Require at least four valid in-app camera photographs.
- Associate every photo with a report draft and capture record.
- Sample location at capture time.
- Store latitude, longitude, reported horizontal accuracy, capture timestamp and location acquisition status when available.
- Distinguish capture-time location from submission-time device location.
- Reject gallery/file-picker uploads for this workflow.
- Prevent clients from directly setting `APPROVED` or `PUBLISHED`.
- Create the report, evidence references and initial processing job reliably.

### Acceptance criteria

- A report with fewer than four valid evidence photos cannot be submitted.
- A repeated submission request using the same idempotency key does not create duplicate reports.
- A failure to dispatch a processing job does not leave a report permanently untracked.
- The user receives a durable submission reference after successful acceptance.

## 7. Stage 2: Evidence validation

Perform server-side validation even when the client has already validated the evidence.

Validate:

- File signature and actual decoded content.
- Supported image formats.
- Configurable size and resolution limits.
- Image decoding and corruption.
- Image quality and usability.
- Exact duplicate file hashes.
- Near-duplicate or highly redundant photographs.
- Capture-record association.
- GPS field validity and accuracy availability.
- Timestamp plausibility.
- Potential replay and suspicious evidence patterns.

Never trust client-provided MIME types or timestamps without validation.

Preserve original evidence in protected storage. Generate sanitized derivatives for public use where required. Do not overwrite original evidence during resizing, redaction or image processing.

### Failure behaviour

- Invalid or corrupt images: request replacement or enter an evidence-validation failure state.
- Missing location: apply the configured location fallback/review policy; do not mark location verified.
- Poor GPS accuracy: request a new location fix or route to location review.
- Excessively redundant photos: request additional independent evidence or moderation review.
- Storage outage: retain the submission in a recoverable state and retry safely.

The application must not silently lower the four-photo requirement to bypass a failure.

## 8. Stage 3: AI evidence analysis

Use an interchangeable AI provider abstraction. Model selection must be configurable and must not require business logic to depend on one vendor's response format.

### Required structured outputs

- Predicted hazard category.
- Relevant visual characteristics.
- Evidence usability assessment.
- Image embeddings or other representations for similarity search.
- Exact and near-duplicate indicators.
- Possible defect boundaries or spatial extent, when supported.
- Relevant visible landmarks and road context, where reliable.
- Confidence or uncertainty information.
- Contradictions between photos.
- Recommended next action.
- Model identifier and version.
- Processing timestamp and schema version.

Use validated structured output schemas. Invalid model output must fail validation and must not be interpreted as a successful analysis.

The model must not invent geographic coordinates from image content. Image-based location inference may be used only as a separately labelled, confidence-scored supporting signal; verified incident coordinates must come from the location-verification workflow.

### AI safeguards

- Do not automatically reject a legitimate report solely because an AI model reports low confidence.
- Do not merge incidents based only on category similarity.
- Do not treat visual similarity as proof of the same physical defect.
- Do not treat AI-generated severity or urgency labels as verified facts.
- Record model and prompt/configuration versions needed to reconstruct decisions.
- Keep prompts, model outputs and internal analysis private by default.

### Failure behaviour

If the provider times out, returns invalid output or becomes unavailable, retry according to policy. If the retry budget is exhausted, record a processing failure and alert operations. Do not continue into automatic matching or publication using missing mandatory analysis.

## 9. Stage 4: Location verification

### Input data

- Capture-time GPS samples.
- Reported horizontal accuracy.
- Capture timestamps.
- Report-level location estimate.
- Available road-segment and map geometry.
- AI-derived defect context, where available.

### Requirements

- Validate coordinate ranges and reject non-finite values.
- Distinguish missing accuracy from high accuracy.
- Use metric/geodesic distance calculations, not raw latitude/longitude degree differences.
- Identify inconsistent samples and location clusters.
- Calculate a robust representative location.
- Record estimated location uncertainty.
- Detect possible different hazards within one submission.
- Check for road-side or road-segment conflicts.
- Preserve all original capture coordinates.
- Allow authorized moderator correction with an audit trail.

### Proposed initial quality bands

These values are configurable and must be validated against pilot data:

- Estimated uncertainty up to 10 metres: eligible for high-quality location consideration.
- Greater than 10 and up to 25 metres: medium-quality location.
- Greater than 25 and up to 50 metres: low-quality location, generally requiring review.
- Greater than 50 metres or unresolved contradiction: do not publish a precise pin automatically.

These are policy bands, not guarantees of physical GPS accuracy.

### Failure behaviour

A missing or ambiguous location must block precise public pin creation. The report may enter location review or an explicit recovery flow. A guessed or AI-hallucinated coordinate must never substitute for a failed GPS verification stage.

## 10. Stage 5: Candidate incident discovery and matching

Use a geospatial index to search nearby incidents efficiently. Prefer PostgreSQL/PostGIS if it is compatible with the existing project.

### Candidate search

Use configurable initial search ranges, such as:

- 30 metres for normal nearby candidate discovery.
- Up to 50 metres for potentially continuous road defects or context-supported extended searches.

These are candidate-discovery radii, not automatic merge permissions.

Consider:

- Distance and GPS uncertainty.
- Problem category.
- Road segment and carriageway.
- Visual embeddings and defect-specific features.
- Capture timestamps and incident status.
- Continuous-defect evidence.
- Contradictions and independent observations.

### Strict automatic merge policy

Automatic merge is permitted only if:

1. All required evidence validation has passed.
2. Location compatibility is acceptable.
3. Evidence supports the same physical defect or the configured continuous-defect rule.
4. No unresolved contradiction exists.
5. The candidate incident is eligible for merging.
6. Exactly one candidate is unambiguously eligible.
7. Calibrated match confidence meets the approved threshold.
8. The model version is approved for production use.
9. The merge operation passes transactional consistency checks.

If any requirement is not met, route to manual review or create a separate incident candidate, according to the configured decision policy.

An initial score of 0.90 may be evaluated during calibration, but must not be treated as a validated probability without calibration evidence.

### Matching failure behaviour

- Multiple plausible candidates: manual review.
- Model unavailable: retry or pending processing.
- Low confidence: manual review.
- Clear different physical hazards: keep separate.
- Closed incident with new damage: evaluate recurrence/reopening rules; do not blindly merge.
- Uncertain continuous-defect boundaries: manual segmentation review.

## 11. Stage 6: Canonical incident and location

When no eligible duplicate exists, create a new canonical incident candidate. When a strict eligible duplicate exists, associate the new report with the existing canonical incident.

The incident must have:

- Stable incident ID.
- Associated original reports.
- Evidence references.
- Category and reviewed summary.
- Canonical location and uncertainty.
- Optional line/polygon spatial extent for continuous defects.
- Current moderation and publication status.
- Location and merge decision versions.
- Audit history.

### Location calculation

- Calculate a robust representative position using validated samples.
- Avoid treating multiple photos from one report as independent citizen observations.
- Cap the influence of highly precise or correlated samples.
- Detect multiple spatial clusters.
- Preserve raw capture locations.
- Store the algorithm version and uncertainty.
- Permit moderator correction without overwriting original capture records.

For long defects, AI may propose a continuous extent. Distinct hazards or uncertain boundaries must be reviewed instead of automatically collapsed into one incident.

## 12. Stage 7: Moderation and approval

For the initial release, all new canonical incidents require approval before public publication, unless a future explicitly approved policy defines a safe automatic-publication cohort.

Reviewers must see:

- Original report details.
- Evidence photos.
- Capture locations and accuracy.
- AI classification and uncertainty.
- Candidate incidents and match rationale.
- Proposed canonical location and spatial extent.
- Validation failures or warnings.
- Relevant audit history.

Reviewer actions:

- Approve.
- Reject with reason.
- Request additional evidence.
- Confirm or correct canonical location.
- Merge with another eligible incident.
- Keep incidents separate.
- Split an incorrectly grouped incident.

A reviewer must not be able to bypass mandatory validation without a separately authorized and audited exception policy. Exceptions must never fabricate missing evidence or claim an unverified location is verified.

## 13. Stage 8: Map publication

### Publication eligibility predicate

The publication service must independently verify that:

- Required evidence is valid.
- Required AI analysis is valid.
- Location verification has succeeded.
- A canonical incident association exists.
- Matching and merge operations are resolved.
- No unresolved mandatory review is outstanding.
- Moderation approval is recorded.
- Canonical location and spatial representation are valid.
- The incident is eligible for public display.
- Privacy-safe public fields and media are ready.

Publication must not rely solely on the client or on a status value supplied by a previous worker.

### Atomic publication

Implement publication through a database transaction or an equivalent consistent mechanism.

The operation must:

1. Lock or version-check the incident.
2. Revalidate the publication eligibility predicate.
3. Create or activate the public incident representation.
4. Record publication state and timestamp.
5. Write a publication audit event.
6. Commit the transaction.
7. Dispatch map/cache updates and notifications through a durable post-commit mechanism.

Repeated publication requests must be idempotent.

The map must display one canonical pin per public incident. Reports merged into that incident must not produce additional public pins.

If a transaction or required eligibility check fails, publication must not commit.

### Public privacy

Do not expose:

- Citizen identity unless separately authorized and consented to.
- Private report fields.
- Raw EXIF or device metadata.
- Internal model prompts or private moderation notes.
- Exact personal/home location where this creates a privacy risk.

Use sanitized media and the canonical public location.

## 14. Failure and retry policy

Every stage must classify errors as:

- Retryable infrastructure/transient failure.
- Permanent input/validation failure.
- Business-rule review requirement.
- Terminal authorized rejection.

Use bounded exponential backoff with jitter for transient failures. Set maximum attempts, processing timeouts and dead-letter handling.

A retry must resume from the earliest failed or invalidated stage rather than repeating every expensive operation unnecessarily.

When a stage fails:

1. Persist the failure and reason.
2. Preserve previous valid outputs.
3. Block dependent stages.
4. Retry if eligible.
5. Otherwise mark the report as requiring intervention or processing failure.
6. Notify the user when action is needed.
7. Alert operators for systemic or repeated failures.

Never mark a failed report as published. Never automatically reject a citizen's report because an internal AI provider is unavailable.

If previously published data becomes invalid after a correction or security incident, apply an explicit unpublish/suspend workflow with an audit record rather than silently leaving invalid public data visible.

## 15. Data model requirements

Reuse existing entities where available; do not duplicate the domain model unnecessarily.

Recommended entities:

- `Report`
- `EvidenceAsset`
- `EvidenceValidationResult`
- `ReportProcessingJob`
- `ProcessingStageExecution`
- `AIAnalysisResult`
- `LocationSampleAssessment`
- `Incident`
- `IncidentReportLink`
- `IncidentLocationEstimate`
- `CanonicalIncidentLocation`
- `IncidentMergeEvent`
- `IncidentSegmentationReview`
- `ModerationAction`
- `PublicationRecord`
- `AuditEvent`
- `OutboxEvent`

Use stable IDs, foreign keys, unique constraints and transaction boundaries.

Important constraints:

- A report must not be marked published unless an eligible canonical incident is published.
- Duplicate active report-to-incident links must be prevented.
- Merge and publication operations must be idempotent.
- Evidence references must point to existing protected objects.
- Original evidence records must not be deleted by merge or split operations.
- Canonical location changes must be versioned.
- Every public incident must have a valid canonical location.
- All state changes must be authorized and validated server-side.

## 16. API requirements

Adapt routes to the existing API conventions.

Possible endpoints:

- `POST /api/reports`
- `GET /api/reports/:reportId`
- `GET /api/reports/:reportId/processing`
- `POST /api/reports/:reportId/evidence`
- `POST /api/reports/:reportId/reprocess` (authorized)
- `GET /api/admin/review-queue`
- `GET /api/admin/reports/:reportId/review`
- `POST /api/admin/incidents/:incidentId/approve`
- `POST /api/admin/incidents/:incidentId/reject`
- `POST /api/admin/incidents/:incidentId/request-evidence`
- `POST /api/admin/incidents/:incidentId/location`
- `POST /api/admin/incidents/merge`
- `POST /api/admin/incidents/:incidentId/split`
- `GET /api/map/incidents`

All administrative routes must enforce authentication, role-based authorization, input validation and audit logging.

Public map endpoints must return only public-safe incident data.

## 17. Security and abuse prevention

Implement:

- Authentication and role-based access control.
- Server-side schema validation.
- CSRF protections where applicable.
- Rate limiting.
- Secure object storage and short-lived upload/download access.
- MIME/content validation and image decoding safeguards.
- File size and decompression limits.
- Secrets management.
- Audit logging.
- Protection against unauthorized incident merges.
- Idempotency controls.
- Signed or authenticated internal job messages where supported.
- Least-privilege service access.
- Data retention and deletion policies.
- Monitoring for suspicious capture patterns and repeated abuse.

Treat image contents, EXIF metadata, descriptions and AI outputs as untrusted data. Do not allow instructions embedded in uploaded content to change system prompts, tool permissions or processing rules.

## 18. Observability

Track:

- Reports submitted.
- Evidence validation success/failure.
- AI provider latency and failure rate.
- Location verification success and review rate.
- Candidate matches per report.
- Auto-merge precision and later unmerge rate.
- Manual review queue size and turnaround time.
- Processing retries and exhausted retries.
- Publication success/failure.
- Duplicate pin prevention.
- Outbox backlog and notification failures.

Use structured logs and correlation IDs linking report, processing job, stage execution, incident and publication event.

Do not log raw image bytes, credentials or unnecessary precise location information.

## 19. Testing requirements

### Unit tests

- State transition validation.
- Evidence count and file validation.
- GPS quality and representative-location calculations.
- Outlier and multi-cluster handling.
- Match eligibility and confidence gates.
- Publication eligibility predicate.
- Idempotency and authorization.

### Integration tests

- Database transactions.
- Queue/outbox delivery.
- Evidence storage failures.
- AI provider timeout and invalid responses.
- Geospatial candidate search.
- Concurrent merge attempts.
- Moderator correction.
- Publication rollback.
- Notification retry behaviour.

### End-to-end tests

1. Valid report with four valid photos and reliable GPS proceeds through all required stages.
2. Invalid photo blocks processing and publication.
3. Missing or invalid location blocks precise pin publication.
4. AI timeout blocks dependent stages and creates a retryable failure.
5. High-confidence duplicate passing all gates associates with the existing incident.
6. Ambiguous duplicate enters manual review.
7. Distinct nearby hazards remain separate.
8. Unapproved incident does not appear on the public map.
9. A valid approved incident produces exactly one public pin.
10. A repeated job does not create duplicate incidents or pins.
11. A moderator correction preserves original location records and audit history.
12. A merge or publication transaction failure leaves no partial committed state.
13. A split operation preserves report and evidence provenance.
14. Public endpoints never expose private report metadata.

## 20. Definition of done

The module is complete only when:

- All required stages are implemented and wired into a durable pipeline.
- State transitions and publication eligibility are enforced server-side.
- The public map only exposes eligible approved incidents.
- Strict automatic matching rules are implemented.
- Manual review supports ambiguous matches and location correction.
- Retry, failure and recovery behaviour is tested.
- Database constraints and transactional boundaries prevent duplicate or partial publication.
- Security and privacy checks are complete.
- Unit, integration and end-to-end tests pass.
- CI validates linting, types, tests, migrations and build.
- Operational dashboards, logs and alerts exist.
- Documentation explains configuration, model calibration, failure recovery and manual review.

## 21. Coding-agent instructions

Before implementation:

1. Inspect the existing repository, database schema, authentication, storage, map UI and queue infrastructure.
2. Identify reusable dependencies and established project conventions.
3. Produce a short implementation plan identifying schema changes, worker stages, API changes, UI changes and test coverage.
4. Do not replace existing infrastructure without a documented reason.
5. Implement incrementally with migrations and backward-compatible changes where possible.
6. Do not use mock AI results in production code paths.
7. Provide deterministic mock providers only for automated tests.
8. Make model providers configurable and validate every response.
9. Never bypass the publication eligibility predicate.
10. Do not claim that any government authority has been contacted by this pipeline.
11. Run the full test suite and report any incomplete work or infrastructure dependency honestly.

**Final outcome:** A citizen submits one report, and the platform automatically processes its evidence, location and incident relationship. If every required stage succeeds and the publication policy is satisfied, one canonical incident is published to the map. If any mandatory stage fails or remains unresolved, the report stays safely unpublised, recoverable and traceable.
