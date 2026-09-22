# Creator Cash Flow: business audit and client pipeline

22 September 2026 · Working strategy, based on the local product and marketing files plus the founder's report of contacting more than 20 agencies/owners, many without a reply. Reply, meeting, pilot and revenue totals were not supplied, so no conversion rate or traction claim is made.

## The decision

Test **small South African agencies running repeat creator campaigns** as the first paying customer. The agency owns the work and can bring its existing creators and brand clients. CCF's entry offer is a clearer handoff from brief through review and client reporting, with fee and invoice status visible. Creators can keep using the free private records product, but that is a separate adoption path with a different buyer and success measure.

This is a hypothesis, not validated demand. Validate it through agencies bringing real campaign work, using the workflow twice, and agreeing to pay for it. Do not broaden the sales pitch to creators, brands and agencies simultaneously.

## Evidence and gaps

| Observation | Consequence | Priority |
| --- | --- | --- |
| The homepage leads with “For creators, agencies & brands” and “Create free account.” The written positioning plan names the agency as initial buyer. | A qualified agency has to infer why the product is for them and what to do next. | High |
| Agency/brand pilot interest currently goes to a generic mailto link; creator signup is the dominant conversion action. | No structured agency qualification, booking or follow-up measurement. | High |
| The public demo is labelled sample data. The collaboration API has organisation, campaign and assignment foundations, but invitation delivery returns `pending_email_integration`; the complete persistent review/report journey is not present. | Sell a *discovery/design pilot*, not a fully operational campaign platform. | High |
| Agency/brand login redirects to separate dashboards; those pages expect `ccf_session` in local storage, while the active shared login path does not store that key before redirecting. The dashboards also insert a fictional campaign into an empty real workspace. | The buyer journey needs a functional and trust review before inviting an agency to use its real campaign. | High |
| The homepage says “brief to payment,” while the release says CCF does not execute payments. | Use “payment milestones” or “fee and invoice status” until payment execution exists. | High |
| Existing agency/brand marketing copy asks for a general partnership conversation. | It does not name one acute cost, trigger or working session. | Medium |
| More than 20 agencies/owners have been contacted and many have not replied. | This is a signal to inspect targeting and message quality, but insufficient data to conclude whether the segment is wrong. | High |

Local evidence: `assets/ccf-landing.js`, `customer.js`, `dashboards.js`, `controllers/collaborationController.js`, `docs/CUSTOMER_RELEASE.md`, `docs/CCF_POSITIONING_AND_PILOT_PLAN.md`, and `marketing/agencies-brands-v1/campaign-copy.md`.

Competitor position: CreatorIQ already advertises agency content approval, client views and campaign reporting; Modash advertises campaign tracking, creator relationship management and payments; Humanz advertises content review and payments. A generic “all in one creator platform” claim is therefore weak. CCF should test whether a smaller team values faster setup, clearer client approval and a lighter workflow with hands-on support. These are vendor descriptions, not independent feature tests. Sources: [CreatorIQ for agencies](https://www.creatoriq.com/best-influencer-marketing-solution/for-agencies), [Modash overview](https://help.modash.io/en/articles/13714522-what-is-modash-and-how-does-it-work), [Humanz platform](https://www.humanz.com/platform/).

## Offer to take to market

**Who:** Founder, head of campaigns, influencer marketing lead or account director at an agency that manages repeat brand creator work, already has a roster and coordinates several people per campaign.

**Problem to test:** “Where does a brief or draft wait for a decision, and how much effort goes into proving to the client what happened?” Ask which of approval chasing, creator follow-ups, reporting or payment-status queries costs the most time. Do not assume the answer.

**Initial offer:** A 25-minute campaign workflow review. Map one recently completed or currently active campaign from brief to client report. Return a one-page map of handoffs, the largest delay, and a proposed pilot workflow. A prospect can get value from this even if CCF is not yet ready for production use.

**Pilot promise:** Once the persistent workflow passes the launch gate, run one agency campaign with its existing roster. Define the scope and baseline in writing. Until then, use a clearly labelled prototype or manual process with permission; do not imply a demo action sent invitations, uploaded content or processed payments.

**One-sentence positioning to test:** “Creator Cash Flow helps lean agency teams keep creator briefs, reviews and client updates in one clear campaign record.” Add invoice/fee status only when the prospect identifies it as a pain.

## Sales pipeline

| Stage | Exit condition | Record |
| --- | --- | --- |
| Targeted | Agency has visible creator campaigns and a relevant decision maker; reason for fit recorded. | Agency, contact, recent campaign, campaign frequency, current tools, personalisation angle. |
| Contacted | One specific, relevant message sent. | Date, channel, exact message, source of contact. |
| Engaged | Prospect replies with a real answer or introduction. | Pain mentioned, buyer role, next step. |
| Discovery | 25-minute review held around one actual campaign. | Current workflow, delays, affected roles, campaign volume, cost of delay, decision process. |
| Pilot candidate | Prospect names a campaign owner and one suitable campaign. | Scope, access needed, success metric, start date, decision maker. |
| Pilot active | Written pilot scope accepted; agency and CCF each have an owner. | Baseline, weekly actions, issues, support time. |
| Repeat/paid decision | Second campaign requested or commercial discussion held with buyer. | Repeat reason, objections, budget and willingness to pay. |

Keep the prospect sheet minimal: agency, contact, channel, fit reason, last touch, next touch, reply, meeting, real campaign, pain, pilot status, payment discussion. Record the *next action and date* for every live opportunity. Stop treating impressions or friendly praise as pipeline.

## What to do with the first 20-plus contacts

1. Reconstruct the list. Mark which messages went to a decision maker, referenced a real campaign and asked a specific question. Note the channel and date. Do not send the same message again to everyone.
2. Segment into likely fit, uncertain fit and poor fit. Prioritise agencies with current creator campaigns, recurring clients and signs of hands-on campaign management. Exclude agencies whose main business is unrelated.
3. For recent unanswered, high-fit contacts, send *one* useful follow-up tied to a specific campaign or workflow question. For older cold contacts, re-approach only if there is a new relevant trigger. Respect a decline or no-contact request.
4. Seek warm introductions from creators, production partners and brand contacts who already know the agency. A relevant introduction is a better test than repeating a generic cold pitch.
5. After a small, well-researched next batch, compare **qualified replies and meetings**, not total messages. If few reply, test contact accuracy, relevance and offer. If meetings happen but no one will share a real campaign, question urgency or trust. If pilots happen but no second campaign follows, investigate product value before scaling outreach.

## Outreach you can use

**First note to an agency owner or campaign lead**

Subject: Quick question about [agency]'s creator campaigns

Hi [name], I saw [specific campaign/client/creator work]. When a creator draft needs both agency and brand approval, where does your team keep the latest version and decision?

I'm building Creator Cash Flow for agency campaign teams. I'm speaking with a few teams about where brief, approval and reporting handoffs get slow. Would a 25-minute review of one recent campaign be useful? I'll send back a simple workflow map and the biggest improvement opportunity, whether or not our pilot is a fit.

[Name]

**Follow-up if no reply**

Hi [name], one concrete question so I don't send you a generic platform pitch: is the harder part of creator work for your team getting approvals, gathering performance evidence, or preparing the client update? If someone else owns that process, I'm happy to speak with them instead.

**Warm introduction request**

“I'm trying to learn how small agency teams handle creator approvals and client updates. Do you know a campaign lead who runs this work regularly and might be open to a short workflow review?”

Personalise the first sentence from evidence. Avoid invented familiarity, a feature list, deck attachment or unverified time-saved claims. Do not claim the agency has the problem before asking.

## Discovery call: six questions

1. Walk me through your last creator campaign, from approved brief to client update. Who was involved?
2. Where did a decision wait the longest, and what happened while it waited?
3. What tools or chats held the latest brief, draft, approval and reporting evidence?
4. How many campaigns follow a similar pattern in a typical month or quarter?
5. What did your team have to assemble manually for the client, and how long did it take?
6. If we solved one handoff in the next campaign, what would make you use the workflow again? Who would approve a paid tool?

Close by summarising the prospect's words, proposing one scoped pilot and agreeing a dated next step. Ask permission before using any campaign material or client data.

## Product pipeline and launch gate

**Now:** Fix the agency/brand login handoff and remove invented campaign data from authenticated empty states. Create an agency-specific pilot inquiry path that records contact, role, campaign frequency and requested follow-up. Align homepage claims with current capability.

**Phase 1 — workflow plus basic results:** One real campaign can be created, participants invited and authenticated, a creator submits a version, the agency reviews it, the brand approves that version, and everyone sees the same authorised state after refresh. Once content is published, the agency or creator attaches the post link, publication date and a few relevant results to the approved deliverable. Every result shows its source (manually supplied or connected platform), reporting period and last update; missing results remain missing. The agency can review these entries before including them in a client update. Clearly separate fee agreed, invoice sent and payment confirmed. A reviewed report export follows from the same campaign record.

**Later Meta integration:** Where an eligible account grants access and the required Meta permissions are available, fetch supported metrics into the same post/result record. Preserve source and freshness labels, and never silently replace a reviewed client report. This extends Phase 1 rather than making the basic campaign workflow depend on API approval.

**Then:** Measure repeat use and time saved. Add templates, roster reuse and reminders only where the pilot exposes repeated work. Defer marketplace discovery, lending, general AI and automated payment movement until a buyer repeatedly asks for them and the core workflow works.

The earlier written plan already proposes this direction. The immediate change is operational discipline: align the acquisition path, narrow the offer, repair the buyer journey and collect evidence from actual campaigns before broadening the story.

## Four-week validation sprint

- Week 1: audit the 20-plus contacts, interview any respondents, repair the buyer path, choose 10–15 high-fit agencies and one positioning sentence.
- Week 2: send researched notes, follow up where appropriate, conduct workflow reviews, record objections and baseline process times.
- Week 3: refine the offer from repeated pains; agree a scoped design pilot with one or two agencies only if there is a named campaign and owner.
- Week 4: review qualified reply rate, meetings, real-campaign commitments and willingness to pay. Decide whether to deepen the agency workflow, change the narrow segment or revise the offer.

Numbers above are planning targets, not forecasts. The strongest signal is a partner who brings a second campaign and agrees to pay. Do not publish pricing until the actual support, storage, social data and onboarding cost per agency is understood.

## Unknowns to resolve with the founder

How many of the 20-plus contacts replied, booked a call and shared a real campaign? What channels and wording were used? Is any agency, brand or creator already using CCF outside a demo? What is the founder's ability to run a hands-on pilot each week? These answers could change the segment, pace and commercial model.
