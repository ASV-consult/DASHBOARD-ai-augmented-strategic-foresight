# Dashboard Optimization Change Spec

Date: 2026-03-13
Baseline pushed to GitHub before edits: `5b08336` (`main`)

## Goal

Optimize the dashboard for executive usability and understandability.
Priority is visual clarity, better page flow, less clutter, and clearer naming.

## Global Changes

- Sidebar default state should be `collapsed`.
- Switching pages should not automatically open the sidebar.
- Add clearer cross-page step navigation inside the strategic pipeline flow.
- Use short, understandable labels instead of internal model labels where possible.
- When content is not yet available, show a clear placeholder such as `Work in progress`.

## Explicit Removals

- Remove `Critical Dependencies` from the Strategy Decomposition overview page.
- Move `Critical Dependencies` into `Objectives & KPIs`.
- Remove `Most Sensitive Assumptions` from Strategic Executive Overview supporting highlights.
- Remove `Impact Pathways` from the Core Assumptions view.
- Remove `Other linked blocks` from the Core Assumptions view.
- Remove `Risk factor` from assumption dependency clusters.
- De-emphasize policy-only framing in Macro stream and replace with clearer STEEPLE framing.
- Do not keep long source text layouts that require horizontal scrolling in signal detail views.

## Streams Home

### Intro / recommended start

- Keep the recommended start section.
- Add that the Financial view is currently being worked on.
- Add that the Macro stream is still in the design phase.

### Strategic stream card

Replace card information with:

- `Signals`
- `Assumptions`
- `Positive / Negative signal ratio`

### Financial stream card

Make the card clearer and more concrete:

- Explain that the stream covers financial analysis and share price analysis.
- Show whether share price analysis is uploaded: `Yes / No`.
- Rename or clarify `Regime` so it clearly means share-price regime / current market situation.
- Replace unclear `Events` wording with a clearer label.

### Macro stream card

- Keep the stream as WIP.
- Reframe around STEEPLE dimensions instead of mostly policy change.
- Make dimensions understandable without overly long text.

### Ready-state labels

- Ensure status text fits inside cards cleanly.
- Shorten phrases like `Ready for executive review` where needed.

## Strategic Executive Overview

### Overall structure

- Keep the overall pipeline visual.
- Improve the content below the pipeline first.
- Bring the executive summary into a cleaner horizontal layout.

### Top executive cards

Change the current executive cards as follows:

- Keep `Assumption pulse`, but make the positive vs negative count explicit.
- Replace the current `Competitive pressure` card with all competitive forces and their score / pressure.
- Keep `Recommended motion`, but set content to `Work in progress`.
- Keep `SWOT storyline` only if it remains readable and useful.

### Signal balance

- Keep the signal balance section.
- Clarify that `Early warning` is a subset / lens related to challenging signals.
- Keep the explanation short.

### Assumption spider visual

- Move the assumption spider visual below the signal balance area.
- Make `Assumption scores` the default view.
- Make the section span horizontally.
- Improve interpretability mainly through visual/UI changes, not long text.
- Replace weak labels like `A4` and `A10` with more understandable assumption naming.
- Do not show the full long descriptions directly on the chart if they make the chart unreadable.

### Assumption detail drill-down

- Keep the first assumption pop-up card because it works well.
- Improve the `Open Full Assumption Detail` page.
- That full page should clearly combine:
  - Full assumption description
  - Assumption scoring
  - Linked signals

### Supporting highlights

- Keep supporting highlights in general.
- Remove `Most Sensitive Assumptions`.

### Synthesized forecast

- Keep the area but mark it `Work in progress`.
- Explain briefly that the goal is to track assumptions over time and show which are improving or deteriorating.

### Step-to-step navigation

When opening pages from the pipeline, add left/right step navigation:

- Top left: previous step
- Top right: next step

Example:

- Strategy Decomposition
- back to Executive Overview
- forward to Core Assumptions

Then continue that pattern through the strategic pipeline.

## Strategy Decomposition Overview

### Strategic building blocks

- Keep strategic building blocks.
- Give `Key Levers` a slightly different tone/color because it is not the same type of block.
- Use a restrained orange/red accent, not something flashy.

### Building block explanations

Improve clarity inside the graphic:

- `Direction & Positioning`: stand out and win in the chosen market
- `Value Creation`: build and capture value
- `Strategic Defence`: secure unique value against market threats

### Primary and support activities

- Keep this section.
- Small visual improvement is fine.
- Do not overwork it.

### Critical dependencies

- Remove from this page.
- Move to `Objectives & KPIs`.

### Strategic goals

- The cards currently click through without enough information.
- Fix the detail state.
- Since the real information is not available yet, use a clear WIP placeholder.
- Improve the visual presentation slightly.

### Objectives, reasoning, and dependencies

Make it clear that:

- Strategic goals are the goal layer.
- Critical dependencies are what those goals depend on.
- Goal cards should also show:
  - where the goal came from
  - explanation / reasoning
  - dependencies
- If missing, use explicit placeholders that clearly read as placeholders.

### KPIs

- Show only critical KPIs.
- Make it clear this section is still being developed.

### Confidence labels

- Replace unclear confidence icon treatment with readable shorthand such as `Conf. High`.

### SWOT

- Show all SWOT fields visually by default.
- Ensure titles are fully readable before clicking.
- Make item shapes/sizes adapt to the text.

## Core Assumptions View

- Remove `Impact Pathways`.
- Remove `Other linked blocks`.
- Remove `Risk factor` from the assumption dependency clusters.

## Assumptions Scores View

- Move the spider chart behind a secondary control / sub-button.
- Main default view should show assumptions themselves.
- Organize assumptions in the same block logic:
  - Value Creation
  - Direction & Positioning
  - Strategic Defence

## Scored Assumption Detail Page

- Upgrade the page opened from a scored assumption.
- Keep all the information, including signals.
- Make the page much more visually attractive and understandable.
- Improve hierarchy and scanning.
- Source information in signal cards must wrap / fit without requiring horizontal scrolling.

## Implementation Notes

- Favor UI clarity over model completeness for executive views.
- Keep explanatory text short.
- Use placeholders where data is missing rather than empty click-through states.
- Preserve the strong parts already working:
  - overall strategic pipeline visual
  - signal balance concept
  - initial assumption pop-up interaction

## Refinement Pass 2

Date: 2026-03-13

### Additional Global Changes

- Replace the left-side navigation with a simpler, more compact top navigation treatment.
- Keep navigation visible but reduce wasted horizontal space.
- Enlarge the upper page-navigation band and make previous/current/next context clearer.

### Strategic Executive Overview refinements

- Make competitive-force cards denser so they take less vertical space.
- Rework the one-view executive summary so signal balance and early warning logic are clearer.
- Make it explicit that early warnings are a subset of challenging signals.
- Reconsider or de-emphasize the current SWOT storyline treatment.
- Keep the assumption spider, but improve assumption labels:
  - use clearer names
  - still include the assumption number
- Make the “click any assumption to inspect...” area more visually engaging and less flat/grey.

### Strategy Decomposition refinements

- Remove the timeline/clock + medium-confidence style item from the strategy snapshot.
- Keep the differentiated key-levers color.
- Add distinct but restrained color treatments for the other building blocks too.
- Rename the activities section to `Primary and support activities`.
- Remove the extra explanatory intro copy from the `Objectives & KPIs` tab.

### Strategic goals refinements

- Goals should behave independently; opening one should not imply everything needs to expand.
- Do not show linked assumptions as a separate section by default.
- Instead, fold critical-dependency logic into each strategic goal card.
- Remove the separate critical-dependencies block underneath goals once that logic is integrated.

### KPI refinements

- Make the `Work in progress` state much more visible for the critical KPI layer.

### SWOT refinements

- Show all SWOT points by default.
- Remove the need to click `show all points`.
- Remove unnecessary `...` truncation from SWOT items.
- Use the available space better so text reads more fully in the default view.

### Core Assumptions / Scored Assumptions refinements

- Bring back the assumption clusters in the scored-assumptions area.
- Make it possible to order/filter the scored assumptions by assumption dependencies.
- Make the filtering and ordering model much clearer visually.

### Signal Stream refinement

- Fully remove the outlier forecast / outlier tab from the signal stream tab structure.

## Refinement Pass 2 Implementation Notes

Date: 2026-03-13

### Explicit removals / replacements

- Remove the left sidebar as the main dashboard navigation.
- Replace the left sidebar with a compact top button-menu layout.
- Remove the timeline / clock chip from the strategy snapshot header area.
- Remove the extra explanatory intro copy from the `Objectives & KPIs` tab.
- Remove the separate `Critical Dependencies` block below strategic goals.
- Remove the separate `Linked assumptions` section from strategic goal cards.
- Remove the `Show all points` interaction from SWOT quadrants.
- Remove the outlier tab from the signal stream page.

### Implemented UI focus for this pass

- Enlarge the upper navigation / context band so previous, current, and next strategic steps are clearer.
- Compress competitive-force presentation so it uses less vertical space.
- Integrate early-warning logic more clearly into the executive summary and signal-balance area.
- Keep assumption labels short but clearer, while retaining the assumption number.
- Make the assumption click-through area more visually distinct.
- Add distinct restrained color treatments for the major strategic building blocks, while keeping key levers visually different.
- Retitle the activities section to `Primary and support activities` and add more visual hierarchy.
- Add a stronger `Work in progress` treatment for the critical KPI layer.
- Add dependency-cluster grouping and filtering back into the scored assumptions view.

## Refinement Pass 3

Date: 2026-03-13

### Executive overview refinements

- Remove the explanatory sentence under `Strategic Impact Verdict (Bottom Line Up Front)`.
- Remove the separate `Signal balance` card from the overview page.
- Fold signal bars into `Assumption pulse` instead.
- Make `Assumption pulse` show assumption states more clearly:
  - `Validated`
  - `Stable`
  - `Challenged`
- Remove the separate overview metrics for:
  - `Early-warning subset`
  - `Watch-list count`
  - `Net posture`

### Color treatment refinements

- Remove faded / tinted background treatments from the executive summary cards where possible.
- Prefer neutral card backgrounds with clearer border colors and icon colors instead of color washes.

### Assumption spider refinements

- Remove the left-side submenu layout next to the spider.
- Integrate spider controls into the same visual block as the chart.
- Simplify the control model so lens and mode selection are easier to read.

### Assumption drill-down refinements

- Make each assumption card stronger visually.
- Increase title clarity.
- Make positive and negative signal counts more explicit inside the card.

## Refinement Pass 4

Date: 2026-03-13

### Full assumption detail refinements

- Redesign the `Assumption Health Analysis` block in the full scored-assumption detail page.
- Replace the flat evidence dump with a clearer executive scorecard layout:
  - stronger top metrics
  - clearer strategic verdict panel
  - validating vs challenging evidence shown in parallel
  - risk factors shown as scannable cards instead of a plain list
- Improve scanability without relying on heavy background fades.

## Refinement Pass 5

Date: 2026-03-13

### Full assumption deep-dive structure refinements

- Remove the strategic-verdict sentence from the top assumption banner.
- Move the full assumption wording out of the top banner and into a click-open section.
- Keep the deep-dive page structured in layers:
  - top assumption identity and signal mix
  - collapsible full framing
  - health analysis
  - evidence signals

### Signal presentation refinements

- Replace the loose sorting strip plus raw two-column list with a dedicated `Evidence signals` section.
- Add clear signal summary counts before the lists.
- Rename the signal columns so it is clearer what each side means:
  - `Signals challenging this assumption`
  - `Signals validating this assumption`
- Improve each signal card so the main claim, score, source, and signal reading are easier to scan without horizontal overflow.

## Refinement Pass 6

Date: 2026-03-13

### Assumption header refinement

- Restore the full assumption wording to the top of the deep-dive page so it is immediately visible on entry.
- Keep the click-open section, but narrow its role to supporting context and rationale instead of hiding the core assumption statement itself.

### Signal browser refinement

- Replace the default deep-dive signal experience with a denser `Signal feed` view for faster scrolling and scanning.
- Keep a secondary `Split compare` mode for side-by-side review.
- Add signal-browser controls for:
  - search
  - filter by challenging / validating / all
  - score ordering
- Increase the signal viewing area so more evidence can be scanned before needing to open individual cards.

## Refinement Pass 7

Date: 2026-03-13

### Signal interaction simplification

- Remove the extra deep-dive signal controls:
  - descriptive helper copy above the list
  - feed / split toggle
  - score-order controls
  - search
  - separate filter buttons
  - in-view counter
- Make the three summary tiles the only signal control model:
  - `Total linked signals`
  - `Challenging`
  - `Validating`
- Use those three tiles as clickable filters for the single scrollable signal list below.

## Refinement Pass 8

Date: 2026-03-13

### Strategy-shell navigation refinement

- Reduce the size and visual weight of the top page-context banner again.
- Keep the header focused on current page context instead of previous/next step cards.
- Move the strategic step navigation to the lower edge of the content area:
  - previous step on the lower left
  - next step on the lower right
- Add a direct path back to `Strategic Executive Overview` so the user can quickly return to the pipeline view from any strategic subpage.
