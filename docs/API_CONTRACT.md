# Implementation wire contract v1

Canonical integration contract for the first real implementation. API prefix `/api/v1`; JSON responses are direct objects (no global data wrapper). All dates ISO UTC. List responses `{items: T[], nextCursor: string|null}`. Errors `{error:{code,message,details?,requestId?}}`. Request ID response header. Bearer access token kept in client memory; HttpOnly refresh cookie. Every authenticated resource uses owner checks; POST/PUT/PATCH/DELETE browser calls use checked Origin. Dev origin http://localhost:5173. No fake predictions.

## Authentication

POST /auth/register `{name,email,password}` -> `{user,accessToken}` + refresh cookie; login `{email,password}` same response. User `{id,name,email,role:'USER'|'ADMIN',createdAt,isDemo:boolean}`. Password >=10 characters. POST /auth/refresh no body -> same. POST /auth/logout -> `{ok:true}`. GET /me -> User. PATCH /me `{name}` -> User. GET /me/sessions -> `{items:[{id,createdAt,expiresAt,current}],nextCursor:null}`. DELETE /me/sessions/:id -> `{ok:true}`.

POST /auth/forgot-password `{email}` -> `{message}` or 503 EMAIL_NOT_CONFIGURED if no mail backend. POST /auth/reset-password `{token,password}` -> `{ok:true}`.

## Capabilities and health

GET /capabilities -> `{classification:boolean,segmentation:boolean,quality:boolean,offlineInference:false,modelStatus:'READY'|'MODEL_NOT_READY'|'UNAVAILABLE',message:string,classes:string[],smtp:boolean}`. No auth required. GET /health/live -> `{status:'ok'}`. GET /health/ready -> `{status, database, storage, ml}`.

## Cases and analyses

Case `{id,label,bodyLocation,createdAt,updatedAt,analyses?:Analysis[],_count?:{analyses:number}}`.

POST /cases `{label,bodyLocation}` -> Case. GET /cases -> paginated Cases. GET /cases/:id -> Case with saved analyses. DELETE /cases/:id -> `{id,status}` deletion receipt.

POST /analyses `{caseId}` -> Analysis. GET /analyses accepts cursor/limit, status, caseId, dateFrom, dateTo, riskLevel -> saved Analysis list (history never includes temporary analyses). GET /analyses/:id -> Analysis (own temporary draft accessible until expiry).

Analysis `{id,caseId,isDemo:boolean,createdAt,updatedAt,expiresAt:string|null,retentionMode:'TEMPORARY'|'HISTORY',processingStatus:'DRAFT'|'QUEUED'|'RUNNING'|'FINISHED'|'FAILED'|'CANCELLED',outcome:string|null,failureCode:string|null,stage:string|null,case?:Case,images:Image[],symptoms:Symptoms|null,consents:{processing:boolean,history:boolean,research:boolean},result:Result|null}`. Optional additional metadata permitted. Map Prisma internals to this shape, don't leak storage paths. Demo provenance is server-managed and cannot be set through public DTOs; seeded example results use provider `demo`, are clearly labelled in UI/PDF, and do not claim real AI inference.

Image `{id,width,height,byteSize,mimeType,quality:Quality|null,roi:{x:number,y:number,width:number,height:number}|null}`. ROI units normalized 0..1; identity of transformed sanitized image preserved. GET /assets/:id/content returns authorized bytes with no-store; client fetches blob with Axios and revokes object URL.

POST /me/consents `{analysisId,processing:boolean,history:boolean,research:boolean,policyVersion:'1.0'}` -> Analysis.consents. Require processing true before upload. On revoked processing cancel analysis; on revoked history delete affected saved analysis. Grant is per analysis. GET /me/consents -> `{items:[{id,analysisId,scope,granted,policyVersion,createdAt}],nextCursor:null}`.

POST /analyses/:id/images multipart field `images` (one or more) -> updated Analysis. DELETE /analyses/:id/images/:imageId -> updated Analysis. PATCH /analyses/:id/images/:imageId/roi `{x,y,width,height}` or `{roi:null}` -> updated Analysis. Client crop is annotation; not AI mask.

POST /analyses/:id/quality-check -> updated Analysis. Quality `{decision:'PASS'|'WARN'|'REJECT',assessmentComplete:boolean,checks:[{code,status:'PASS'|'WARN'|'REJECT'|'NOT_ASSESSED',value?:number,message:string}],width?:number,height?:number}`.

Symptoms `{duration:'DAYS'|'WEEKS'|'MONTHS'|'YEARS'|'UNKNOWN',itching:'YES'|'NO'|'UNKNOWN',pain:'YES'|'NO'|'UNKNOWN',bleeding:'YES'|'NO'|'UNKNOWN',changing:'YES'|'NO'|'UNKNOWN',asymmetry:'YES'|'NO'|'UNKNOWN',border:'YES'|'NO'|'UNKNOWN',color:'YES'|'NO'|'UNKNOWN',diameterMm?:number|null,notes?:string}`. PUT /analyses/:id/symptoms -> updated Analysis. `questionnaireVersion:'1.0'` server-managed.

POST /analyses/:id/submit `{primaryImageId?:string,acknowledgeWarnings?:boolean}` with Idempotency-Key -> HTTP202 Analysis. Never silently use rejected images; reject submission if any image REJECT until user removes it. Model unavailable may terminal FAILED/MODEL_NOT_READY after real quality check. No diagnosis fabricated.

POST /analyses/:id/cancel -> Analysis. DELETE /analyses/:id -> `{id,status}`. Result `{predictions:[{classCode,score,scoreType}],riskLevel:'LOW'|'MEDIUM'|'HIGH'|'NOT_ASSESSED',malignantProbability:number|null,uncertaintyReasons:string[],recommendation:string,modelVersion:string|null,pipelineVersion?:string,maskAssetId?:string,heatmapAssetId?:string}`. Nullable/absent result on failed processing; don't invent completed result.

GET /cases/:id/compare?left=analysisId&right=analysisId -> `{left:Analysis,right:Analysis,limitations:string[]}`. Both must be same case, saved, owner authorized.

POST /analyses/:id/report -> `{id,status:'READY'}` for FINISHED valid/nontechnical result only. GET /reports/:id/download -> private application/pdf attachment.

POST /me/export -> JSON attachment export. DELETE /me/data -> deletion receipt. DELETE /me `{password}` -> deletion receipt, session revoked. GET /deletions/:id -> own `{id,status:'PENDING'|'RUNNING'|'COMPLETED'|'FAILED',createdAt,completedAt?}`.

GET /admin/system -> operational metrics only, admin required. GET /admin/models -> safe capability/model metadata, admin required.

## ML internal

ML localhost8001; X-Service-Token from env. GET /health, GET /capabilities. POST /quality multipart `image` -> Quality. POST /infer multipart `image` -> versioned ML result; unavailable model HTTP503 `{error:{code:'MODEL_NOT_READY',message}}`. ML agent must document exact successful response and coordinate backend before implementation.

## Local mode

User-authorized OpenAI extension: `/capabilities` adds `provider:'local'|'openai'`, `externalAiRequired:boolean`, `aiReview:boolean`. OpenAI review is not a validated six-class classifier: classification/segmentation remain false, review may be ready. `/me/consents` accepts `externalAi:boolean` default false; Analysis.consents includes externalAi. Backend and ML both require this before external submission. `/infer` multipart `external_consent=true` required for openai. Result adds `provider`, `summary`, `observations:string[]`, `limitations:string[]`; predictions score can be null with NOT_CALIBRATED; never manufacture numeric probabilities. Provider error states are technical failures, not skin results. Key is .env only. No medical photos sent by tests unless explicitly authorized per test; use synthetic inputs.

Visual review v2 adds optional backward-compatible fields: `analysisMode:'VISUAL_DIFFERENTIAL'`, `imageAssessment:{skinVisible:boolean,imageSuitable:boolean,reason:string}`, `differential:[{classCode:existingSixCodes|'OTHER',condition:string,supportingFeatures:string[],uncertainties:string[]}]`, `nextSteps:string[]`, `followUpQuestions:string[]`. Differential is ordered by visual fit, not calibrated probability. `OTHER` never enters the legacy six-class predictions. Outcomes: `OBSERVATIONS_READY` for supported image with hypotheses, `UNCERTAIN` for supported but insufficient evidence, `IMAGE_UNSUITABLE` for visible skin with insufficient image detail, `UNSUPPORTED_DOMAIN` for non-skin. External risk remains `NOT_ASSESSED` and malignantProbability null. Saved old results/reports are unchanged; a new analysis is required to run the updated prompt.

Quality v2 does not reject on global Laplacian alone; low detail is WARN and needs acknowledgeWarnings. Near-constant source pixels and extreme exposure remain REJECT. Previously cached draft quality can be refreshed via `/analyses/:id/quality-check`. ROI remains a manual annotation; v2 sends a usable selected crop alongside the full image, without claiming automatic segmentation.

API port3001, Vite5173 proxy /api, PostgreSQL isolated55439, ML8001. Local private filesystem storage allowed for development as honest adapter, production Compose S3. Redis unavailable locally: durable PostgreSQL jobs/recovery accepted as documented local runner; Redis/BullMQ used in Compose where available. Root owns scripts and env. Each workspace reads root .env (dotenv path based on process cwd/root helper). Root dev launcher sets cwd repo and imports env.
