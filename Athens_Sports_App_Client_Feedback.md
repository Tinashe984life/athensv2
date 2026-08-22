# Athens Sports App — Client Feedback & Change Requests
Source: Athens Sports App Spec (client annotations, page 7 onward)
Purpose: Implementation checklist for Copilot

---

## 1. Coach Landing Page (Overview)
**Client comment:** "You can remove the following – 'Create rehab plan'. The rest is very nice."

**Action:**
- [ ] Remove the "Create Prehab Plan" quick action card from the Coach landing page.
- No other changes — rest of layout approved as-is.

---

## 2. Coach Dashboard
**Client comment:** "I like the coach dashboard. Very good overview."

**Action:**
- [ ] No changes required. Approved as-is.

---

## 3. Athletes Board
**Client comment:** "On this board, named 'ATHLETES', for a quick glimpse can we showcase the following: Athlete name and surname [as you currently have]. Remove weight and dominant side and replace it with: Specific position, Summer sporting code, Winter sporting code."

**Action:**
- [ ] Keep: Athlete name and surname on each athlete card.
- [ ] Remove: Weight field from card summary view.
- [ ] Remove: Dominant side field from card summary view.
- [ ] Add: Specific position field to card summary view.
- [ ] Add: Summer sporting code field to card summary view.
- [ ] Add: Winter sporting code field to card summary view.

---

## 4. Teams Page (Team Stats panel)
**Client comment:** "Not bad to have teams and select specific teams especially from a management point of view. Can we take the TEAM STATS and replace them as follows: Average Bleep score, Average Sport attendance, Average gym attendance."

**Action:**
- [ ] Replace current Team Stats metrics (Total Athletes, Avg Age, Avg Height, Avg Weight) with:
  - [ ] Average Bleep score
  - [ ] Average Sport attendance
  - [ ] Average gym attendance

---

## 5. Wellness Dashboard
**Client comment:** "This is the important board. The data comes from athlete wellness questions checking in which will eventually link with the ACWL equation. *If the athlete hasn't completed the check-in please can we send them a reminder to do so before 0800am? They must complete over the weekend."

**Action:**
- [ ] Flag this module as high priority / core feature.
- [ ] Connect daily wellness check-in data to the ACWR (workload) calculation pipeline.
- [ ] Build automated reminder notification:
  - [ ] Trigger if athlete has not submitted daily wellness check-in.
  - [ ] Send before 08:00am.
  - [ ] Reminders must also fire on weekends (Saturday & Sunday), not just weekdays.

---

## 6. Performance History / Performance Page
**Client comment:** "On this page, to see the team's performance can we do the following on this landing page: Performance Test — TERM [1,2,3 and 4]. Test done [see last page with each test and the explanation of the test AND how to improve on]. Performance statistics — you can place an average of the team in each block."

**Action:**
- [ ] Add Term filter/selector with options: Term 1, Term 2, Term 3, Term 4.
- [ ] For each performance test, display:
  - [ ] Test name / what was done.
  - [ ] Explanation of what the test measures/purpose (see reference table in Section 12 below).
  - [ ] How to improve the result (see reference table in Section 12 below).
- [ ] Performance Statistics blocks (Bench Press, Deadlift, Height, Squat, Weight, etc.): add a **team average** value in each stat block (currently shows only individual athlete's latest measurement).

---

## 7. Workload Page — ACWR Trend Chart
**Client comment:** "FANTASTIC PAGE!!!!!!!!! Would there be a team average one?"

**Action:**
- [ ] Add a **team-average ACWR view** (aggregate across all athletes on a team), in addition to the existing individual athlete view.

**Reference — ACWR calculation logic supplied by client (for dev accuracy):**
- Formula (Session Rating of Perceived Exertion method): `AU = sRPE x Duration`
- Acute load = sum of the current week's training load.
- Chronic load = average of the last 4 weeks' total load.
- ACWR = Acute load ÷ Chronic load.
- If an athlete logs 2 sessions in a single day, sum the AU of both sessions to get that day's Acute load contribution.
- Interpretation bands:
  - ACWR > 1.5 → over-training state.
  - ACWR > 0.8 (up to threshold) → under-training state (per client note; see also 0.8–1.3 "sweet spot" below — flag this discrepancy with client for clarification).
  - ACWR between 0.8 and 1.3 → sweet spot / optimal.
- Note: client's written notes contain a possible inconsistency ("ACWR over 0.8 indicates an under-training state" vs. "0.8–1.3 is the sweet spot") — confirm exact thresholds with client before finalizing logic. The in-app "About ACWR" panel currently shows: 0.8–1.2 optimal, 1.2–1.5 moderate risk, >1.5 high risk, <0.8 detraining risk — reconcile this against the client's written formula notes.

---

## 8. Injuries Page — Injury Reporting (Athlete-facing)
**Client comment:** "The kids can report an injury with the following data: Injury date. Select if the injury happened – during sport training / during sport match / other [if other then they need to say where]. Mechanism of injury [can we do drop down selection]. Once reported they must get a little thing that says: 'Thank you for reporting your injury, however you must visit the medical office for an injury assessment and final reporting which happens every day at first break.'"

**Action:**
- [ ] Injury report form (athlete self-report) must capture:
  - [ ] Injury date.
  - [ ] Context of injury — select one: "During sport training" / "During sport match" / "Other".
    - [ ] If "Other" selected, show a free-text field asking where the injury occurred.
  - [ ] Mechanism of injury — convert to a **dropdown selection** (currently free text).
- [ ] After submission, display confirmation message to the athlete:
  > "Thank you for reporting your injury, however you must visit the medical office for an injury assessment and final reporting which happens every day at first break."

---

## 9. Concussion Page
**Client comment:** "This page we need to refer them to the concussio app. www.concusio.co.za" (QR code for "Headway by Concusio" provided).

**Action:**
- [ ] Replace/redirect the in-app Concussion Management page content to refer athletes/coaches to the external Concusio app.
- [ ] Include link: https://www.concusio.co.za
- [ ] Include the "Headway by Concusio" QR code image on this page.

---

## 10. Record Performance Test Page
**Client comment:** "We could have this landing page. If the coach wants to add a test but wonder if this should be left out for now because we will pull everything from your data sheet."

**Action:**
- [ ] Flag as **optional / lower priority** — hold off building the manual "coach adds a test" flow for now.
- [ ] Confirm with client: performance test data will instead be bulk-imported from their existing Excel data sheet (see also spec section "Known Challenges" — data entry is handled by their team via Excel, not directly by students/coaches).

---

## 11. ACWR Calculator Page
**Client comment:** "This again is my biggest important one."

**Action:**
- [ ] Flag as **top priority feature** — no functional changes requested, but ensure this page is stable, accurate, and thoroughly tested given its importance to the client.

---

## 12. Log Training Session (Modal)
**Client comment:** "So this page is here if the coach needs to help a kid log a training session. Sport type we can keep at school but need the outdoor once to cover so that the ACWL works, that said the following should be done."

**Action:**
- [ ] Expand the Sport Type dropdown to include (in addition to existing school sports):
  - [ ] Hockey
  - [ ] Indoor hockey
  - [ ] Netball
  - [ ] Basketball
  - [ ] Social soccer
  - [ ] Tennis
  - [ ] Squash
  - [ ] Swimming
  - [ ] Waterpolo
  - [ ] Horse riding
  - [ ] Dance
  - [ ] Gymnastics
  - [ ] Cross country running
  - [ ] HYROX
  - [ ] Cycling
- [ ] Session Type field should offer:
  - [ ] Gymnasium training
  - [ ] Field training
  - [ ] Match / Game

---

## 13. Log Recovery Session (Modal)
**Client comment:** "Again, this is so that coach can help log a session BUT the athlete has to do it on their profile. The recovery modalities that can be used are [you can place this under the athlete's profile too]."

**Action:**
- [ ] Ensure athletes (not just coaches) can log recovery sessions from their own profile.
- [ ] Recovery Modalities selection should include:
  - [ ] Active Isolated Stretching
  - [ ] Static stretching
  - [ ] Dynamic stretching
  - [ ] Foam roll
  - [ ] Compression socks
  - [ ] Compression boots
  - [ ] Bike ride
  - [ ] Recovery cool down walk
  - [ ] Ice bath
- [ ] Make this same Recovery Modalities list available under the Athlete's own profile view (not only via coach-initiated modal).

---

## 14. Learner's View — Landing Page
**Client comment (bug report):** "Couldn't access it on the 22/06/2026."

**Action:**
- [ ] **Bug:** Investigate and fix access issue preventing the Learner/Athlete landing page from loading (reported 22 June 2026).
- [ ] Confirm fix with client once resolved.

---

## 15. Reference Content — Test Explanation Table (for Performance page, Section 6 above)
Client supplied full explanatory content to be shown wherever performance test results are displayed (per Section 6 request). Include as static reference content/tooltips per test.

| Category | Test | What it measures / purpose | How to interpret result | How to improve |
|---|---|---|---|---|
| Flexibility | Knee to Wall | Ankle dorsiflexion range of motion (calf flexibility) | Compare to norm table / previous result | Regular stretching / exercises challenging ankle dorsiflexion |
| Flexibility | Sit and Reach | Flexibility of lower back and hamstrings | Compare to norm table / previous result | Regular stretching of lower back & hamstrings |
| Flexibility | Y-Balance | Dynamic balance; lower limb injury risk indicator | Compare composite score to Y-Balance norm chart (by gender, age, sport) | Improve single-leg dynamic stability and flexibility |
| Muscle Endurance | 1-Minute Push-up | Upper body strength and muscular endurance | Compare to norms table (by gender) / previous result | Pressing movements in gym or push-up practice for position-specific strength/endurance |
| Muscle Endurance | 1-Minute Sit-up | Abdominal and hip flexor strength/endurance | Compare to norms table (by gender) / previous result | Abdominal and hip flexor strengthening exercises |
| Agility | Illinois Agility Test | Acceleration, deceleration, change of direction | Compare to norms chart (by age, gender, sport) | Strength/plyometrics work and agility drill practice |
| Power | Opto-Jump (general) | Lower body power output and stretch-shortening cycle efficiency | Track jumps over time vs. most recent result | — |
| Power | Stiff Arm Jump | Isolated lower-body power (no upper-body countermovement) | — | Plyometrics practice and lower body strength development |
| Power | Double Leg Countermovement Jump | Lower body power with countermovement (SSC efficiency) | — | Lower body strength and plyometric capacity development |
| Power | Single Leg Countermovement Jump (L/R) | Single-leg power production, left vs right | — | Single-leg plyometrics and single-leg strength work |
| Speed | 10m–40m Sprint | Acceleration and speed | Compare to norms chart (10m/40m norms chart availability unconfirmed) | Increase lower body strength for force production; sprint practice |
| Cardiovascular Endurance | Beep Test | Standardized estimate of VO2max across sports | Plug score into beep test calculator/formula for distance + VO2max estimate; compare to norms (age, gender, sport) | Increase aerobic capacity via cardiovascular training |

---

## Summary Priority Flags (per client emphasis)
- 🔴 **Highest priority:** ACWR Calculator page ("my biggest important one").
- 🟠 **High priority:** Wellness Dashboard ("the important board") + 08:00am weekend reminder logic.
- 🟢 **Positive / no change needed:** Coach Dashboard landing page (general), ACWR trend chart concept.
- 🟡 **Deferred/optional:** Manual "Add Performance Test" flow — client plans to bulk-import from Excel instead; confirm before building further.
- 🐞 **Bug to fix:** Learner's View landing page inaccessible (reported 22/06/2026).
- ❓ **Needs clarification:** ACWR threshold bands — client's written formula notes appear inconsistent with the in-app "About ACWR" panel; confirm correct thresholds before implementation.
