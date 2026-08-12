You are working on Nia Football.

Nia Football is a football technology platform.

Positioning:
> The operating system for football development in Africa.

---

# 1. HOW TO WORK ON THIS PROJECT

Treat this as a real production SaaS product.

Do not treat the repository as a coding exercise, prototype or generic dashboard project.

Before implementing a feature:

1. Understand the existing architecture.
2. Inspect the relevant files.
3. Understand the database model.
4. Check authentication and permissions.
5. Check existing integrations.
6. Reuse existing patterns where appropriate.
7. Make the smallest coherent change.
8. Test the result.

Do not rewrite large parts of the application unnecessarily.

Do not introduce a new library when the existing stack can solve the problem.

---

# 2. CORE STACK

The approved core stack is:

- TypeScript
- Next.js (API ROUTES)
- App Router
- Tailwind CSS
- Shadcn
- Recharts
- Supabase
- PostgreSQL
- Supabase Auth
- Cloudflare Stream
- Cloudflare R2
- Render
- Python
- PyTorch
- OpenCV
- YOLO

Do not replace these technologies casually.

If a technology change is necessary, explain why before making a broad architectural change.

---

# 3. ARCHITECTURAL STYLE

Start as a modular monolith.

Do not create microservices simply because the product may eventually scale.

Keep clear boundaries between:

- UI
- domain logic
- database
- authentication
- permissions
- external providers
- video
- storage
- ML

The application must remain easy for a small engineering team to maintain.

---

# 4. MULTI-TENANCY IS NON-NEGOTIABLE

Nia is a multi-tenant SaaS product.

Every organisation must be isolated.

Never assume:

    organisation_id

provided by the client is trustworthy.

Always derive access from the authenticated user and organisation membership.

Every protected operation must verify:

- authentication
- organisation membership
- role
- resource ownership
- entitlement when required

---

# 5. DATABASE RULES

Use Supabase PostgreSQL.

Use:

- UUIDs
- foreign keys
- indexes
- constraints
- timestamps

Enable Row Level Security on all user-accessible tables.

Never disable RLS simply to make a feature easier.

Never expose the Supabase service role key to the browser.

Do not store video files in PostgreSQL.

---

# 6. AUTHENTICATION

Supabase Auth is the authentication authority.

Organisation roles are:

- owner
- admin
- coach
- analyst
- media
- viewer

Roles belong to organisation membership.

A user may belong to multiple organisations.

Do not implement a single global role.

---

# 7. VIDEO ARCHITECTURE

Cloudflare Stream is the primary video system.

Use Stream for:

- livestreaming
- live recording
- video playback
- adaptive streaming
- direct video upload

Cloudflare R2 is the durable asset layer.

Use R2 for:

- permanent clips
- exports
- thumbnails
- ML artifacts
- durable generated assets

Do not copy every full Stream recording into R2.

Do not store permanent video on Render.

---

# 8. CLOUDFLARE CREDENTIALS

Cloudflare credentials are server-side only.

Never:

- expose API tokens
- expose R2 secret keys
- expose signed credentials
- put secrets in client components

Cloudflare calls belong behind server-side integration boundaries.

Prefer:

    services/cloudflare/

or an equivalent existing structure.

---

# 9. EXTERNAL SERVICE ABSTRACTION

Do not scatter provider API calls throughout the application.

Use clear service boundaries.

Examples:

    CloudflareStreamService

    CloudflareR2Service

The application domain should not depend unnecessarily on raw provider implementation details.

---

# 10. VIDEO CAPTURE

Capture is a first-class product feature.

The capture interface must work on a phone at a football pitch.

Prioritize:

- large controls
- obvious state
- minimal navigation
- connection status
- recording status
- camera status

Important states:

- READY
- CONNECTING
- LIVE
- RECORDING
- RECONNECTING
- DEGRADED
- OFFLINE
- UPLOADING
- COMPLETE
- ERROR

Never silently fail.

---

# 11. CONNECTIVITY

Assume users may have:

- unstable mobile data
- poor bandwidth
- packet loss
- high latency
- intermittent connection

Always consider:

- reconnecting
- retrying
- resumable uploads
- provider state
- clear user feedback

Do not assume perfect broadband.

---

# 12. MULTIPLE CAMERAS

Sessions may contain multiple camera sources.

Example:

    Main
    Tactical
    Goal

Each camera should have a distinct identity.

Each camera may have a distinct Stream input.

Keep raw camera angles available.

Do not build a complex broadcast mixer unless explicitly requested.

---

# 13. FOOTBALL DOMAIN

Do not turn Nia into generic video-management software.

The core objects are:

- organisations
- teams
- players
- sessions
- matches
- cameras
- videos
- events
- clips
- analysis

The application language should reflect football operations.

---

# 14. PITCH CONDITIONS

Support:

- grass
- turf
- gravel
- sand
- mud
- mixed
- other

Do not assume all users operate on professional grass pitches.

This is an important product context.

---

# 15. EVENTS

Initial football events include:

Attacking:

- build-up
- progression
- chance creation
- shot
- goal
- cross
- third-man action
- half-space reception
- rotation
- space creation
- space exploitation

Defending:

- press
- pressing pair
- counterpress
- recovery
- interception
- defensive transition
- block

General:

- foul
- corner
- free kick
- throw-in
- substitution
- injury
- pause

Do not create an unnecessarily large taxonomy without a product reason.

---

# 16. AI / ML

ML uses:

- Python
- PyTorch
- OpenCV
- YOLO

The initial objective is:

- player detection
- ball detection
- tracking foundations

Do not pretend that computer vision understands football tactics before the required models exist.

Do not create fake AI output.

Do not create fake confidence scores.

Do not fabricate analytics.

---

# 17. AI REVIEW

AI-generated football events must be reviewable.

Use:

    Suggested
    Confirmed
    Edited
    Rejected

Human analysts remain responsible for final validation.

---

# 18. STRUCTURAL DYNAMIC SUPERIORITY

Nia's long-term intelligence system will be based around Structural Dynamic Superiority.

Do not invent arbitrary scores.

Potential future dimensions:

### Structure

- width
- depth
- vertical spacing
- horizontal spacing
- half-space occupation
- connection density

### Dynamics

- pre-reception movement
- rotations
- third-man actions
- support movements
- structural adaptation

### Manipulation

- opponent displacement
- space creation
- space exploitation

### Defensive structure

- pressing pair integrity
- cover
- counterpress connection
- compactness

Any metric must eventually have a documented football definition and calculation method.

---

# 19. USER INTERFACE

Nia should not look like a generic AI startup.

Avoid:

- excessive gradients
- excessive rounded cards
- giant hero sections
- meaningless charts
- fake metrics
- decorative AI icons
- excessive animations
- generic dashboard templates
- "AI-powered" everywhere

Prefer:

- clear typography
- compact layouts
- tables
- useful filters
- strong hierarchy
- deliberate spacing
- restrained visual design
- obvious status indicators

The interface should feel like professional football operations software.

---

# 20. RESPONSIVE DESIGN

The product is not a native mobile application.

The web application must be responsive.

Capture mode must be optimized for mobile.

Analysis mode should be optimized for desktop.

Do not compromise the analyst's desktop workflow simply to make every page look identical on mobile.

Use responsive layouts based on the job being performed.

---

# 21. DATA OWNERSHIP

Organisation data belongs to the organisation.

Never expose one organisation's:

- players
- sessions
- videos
- clips
- events
- analytics

to another organisation without explicit sharing functionality.

---

# 22. SECURITY

Never:

- expose secrets
- bypass RLS
- trust client authorization
- expose database credentials
- store passwords
- store permanent files on Render
- put sensitive tokens in localStorage

Use:

- server-side authorization
- RLS
- signed URLs
- environment variables
- validation
- audit logging

---

# 23. API DESIGN

Next.js Route Handlers are the default API layer.

Route handlers should be thin.

Preferred flow:

    Route Handler
        ↓
    Authentication
        ↓
    Authorization
        ↓
    Validation
        ↓
    Domain Service
        ↓
    Repository / Provider
        ↓
    Response

Do not put large business workflows inside route handlers.

---

# 24. VALIDATION

Validate all external input.

Use the project's existing validation library if one exists.

Do not trust:

- query parameters
- route parameters
- request bodies
- organisation IDs
- provider IDs

Validation errors should be structured and user-readable.

---

# 25. ERROR HANDLING

Never show raw internal errors to users.

Bad:

    Cloudflare API returned 403 because token was invalid.

Good:

    We couldn't connect this camera. Check the connection and try again.

Technical details belong in logs.

---

# 26. LOGGING

Use structured logs.

Log important failures.

Do not log:

- passwords
- API tokens
- secrets
- signed URLs
- unnecessary personal information

---

# 27. PERFORMANCE

Design for:

- 1,000+ organisations
- 10,000+ users
- large video libraries
- millions of football events

Use:

- pagination
- indexes
- server-side filtering
- lazy loading
- efficient queries

Never fetch an entire organisation's video library simply to render a list.

---

# 28. EMPTY STATES

Never fabricate data to make the interface look populated.

If there are no videos:

    No videos yet.

If there are no clips:

    No clips have been created for this session.

Empty states should tell the user what they can do next.

---

# 29. NO FAKE FEATURES

If an integration is not implemented, do not make a button pretend it works.

If AI is not implemented, do not generate fake AI results.

If livestreaming is unavailable, do not display fake "LIVE" state.

If analytics are not calculated, do not display placeholder numbers as real data.

A smaller honest product is better than a larger fake product.

---

# 30. TESTING

Prioritize:

1. tenant isolation
2. permissions
3. authentication
4. video workflows
5. clip workflows
6. event workflows
7. provider integrations
8. retention
9. deletion

Every new protected feature should have an authorization test.

---

# 31. CODE QUALITY

Prefer simple code over clever code.

Avoid:

- unnecessary abstractions
- premature generic frameworks
- duplicate business logic
- massive components
- massive route handlers
- hidden side effects

Use clear names.

A future engineer should understand the code without asking what an AI generated.

---

# 32. DEPENDENCIES

Before adding a dependency:

1. Check whether the project already has something suitable.
2. Check whether the platform provides the capability.
3. Check whether the dependency is actually necessary.
4. Prefer stable, well-maintained packages.

Do not add packages for trivial functionality.

---

# 33. DATABASE MIGRATIONS

All schema changes must be represented through proper migrations.

Do not manually modify production database structure without a migration.

Migrations must be:

- reproducible
- reviewable
- ordered

When adding a table:

1. create migration
2. add indexes
3. add constraints
4. add RLS
5. add policies
6. test access

---

# 34. ENVIRONMENT

Never commit secrets.

Maintain:

    .env.example

with variable names only.

Required integrations may include:

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    CLOUDFLARE_ACCOUNT_ID
    CLOUDFLARE_STREAM_API_TOKEN
    CLOUDFLARE_R2_ACCESS_KEY_ID
    CLOUDFLARE_R2_SECRET_ACCESS_KEY
    CLOUDFLARE_R2_BUCKET
    CLOUDFLARE_R2_ENDPOINT

---

# 35. DEVELOPMENT DATA

Development may use:

    Ashfall United FC

with:

    First Team
    U18
    Academy

Development data must be clearly distinguishable from production data.

Never seed fake analytics and allow them to appear as real production information.

---

# 36. BUILD ORDER

When the repository is empty or incomplete, prefer this sequence:

## Step 1

Project foundation.

## Step 2

Supabase authentication.

## Step 3

Organisation and membership model.

## Step 4

RLS and permissions.

## Step 5

Teams and players.

## Step 6

Sessions and matches.

## Step 7

Camera management.

## Step 8

Cloudflare Stream integration.

## Step 9

Capture and livestreaming.

## Step 10

Video playback.

## Step 11

Clips.

## Step 12

Events and player tagging.

## Step 13

R2 durable assets.

## Step 14

Python ML service.

## Step 15

AI-assisted events and highlights.

Do not skip directly to AI.

---

# 37. WHEN IMPLEMENTING A FEATURE

Before coding, answer internally:

- What user needs this?
- Which organisation owns the data?
- Which role can perform the action?
- What database records are involved?
- Does this require an external provider?
- What happens if the provider fails?
- What happens if the network fails?
- What happens if the user refreshes?
- What happens if permission changes?
- What happens when data expires?

Then implement.

---

# 38. WHEN SOMETHING IS UNCLEAR

Do not invent a product decision that could materially affect architecture.

If a requirement is genuinely ambiguous and choosing incorrectly would create significant rework:

Ask one focused question.

Otherwise:

Make the smallest reasonable implementation consistent with the existing architecture.

---

# 39. PRODUCT VOICE

The product is football software.

Use language such as:

- Match
- Training
- Session
- Player
- Coach
- Analyst
- Media
- Camera
- Clip
- Event
- Analysis
- Team

Avoid generic SaaS language such as:

- Workspace magic
- AI insights engine
- Intelligence cockpit
- Smart collaboration hub
- Growth dashboard

Nia should sound like football software, not an AI template.

---

# 40. FINAL STANDARD

Before considering work complete, ask:

Would a serious football club actually use this?

Would a media operator understand it beside a pitch?

Would an analyst trust the workflow?

Would a coach understand the output?

Would the architecture survive another 999 organisations?

If not, improve it.

Build Nia Football deliberately.

Do not build what looks impressive.

Build what works.