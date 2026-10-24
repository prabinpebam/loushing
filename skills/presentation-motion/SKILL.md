---
name: presentation-motion
description: "Use when designing presenter-controlled slide animation, fragment reveals, transitions or motion reviews. Plan semantic proof states, preserve interruption and backward navigation, and validate reduced-motion and static fallbacks without requiring Slate."
---

# Presentation motion

Motion should prove a relationship, quantity, sequence or state change. It is not a
substitute for a clear slide. This standalone workflow plans and implements motion
using the target project's existing player or browser APIs, not a bundled runtime.

## Inputs and capability gate

Read the deck source, claims, host/player API, theme and accessibility requirements.
Determine who owns navigation and state. With no player, keep a usable static deck
and propose the smallest progressive enhancement before adding controls.

Do not emit a Slate motion manifest or promise it will run without Slate. Do not
install an animation library just because the source kit used one. Other skills are
optional; the complete workflow follows here.

## Design the proof

For each candidate slide, write:

```text
claim:
visual mechanism:
stable subject IDs:
initial meaningful hold:
proof fragments:
final hold:
Next / Previous / direct jump:
reduced / off equivalent:
```

1. Begin from the claim, not from entrance effects on a generic card grid.
2. Choose the mechanism: connectors for relationships, a route for handoff, bars
   sharing a baseline for quantities, layers for hierarchy, a marker for state.
3. Author a complete, readable static final state first. Preserve text, reading
   order, theme behavior, sources and accessible descriptions.
4. Give independently moving subjects stable semantic IDs. Wrap transformed groups
   separately from labels and connectors when they need different anchors.
5. Use fragments only at meaningful proof states. Usually 2-3 are enough; an atomic
   claim can have one. Do not fragment every object.
6. The first hold must show enough context to speak; no blank pre-roll. The final
   hold remains available for discussion. Later fragments never autoplay.
7. Start with 250-700 ms for a focused action, up to 1200 ms for a meaningful path;
   transitions usually need only 150-500 ms. Speaking rhythm, not video pacing,
   determines the sequence.

## Implement through one state owner

Prefer the player's documented API. If ordinary browser APIs are appropriate:

- Model explicit state `(slideId, fragmentId, motionMode)`, including a no-fragment
  state. Keep history of semantic states, not elapsed animation time.
- A single transition function computes target state from Next, Previous or jump.
  Validate IDs before changing state; show a useful error for an invalid target.
- On navigation, cancel in-flight Web Animations API animations and apply the
  destination's exact styles/visibility before starting any new animation.
- A direct jump computes the destination directly; never play intermediate slides.
- Previous removes one proof phase or enters the previous slide's defined hold.
  It does not rewind a cinematic timeline through micro-events.
- Scope keyboard controls to the deck/player; do not intercept typing in fields,
  modifier shortcuts or unrelated page interactions.
- Separate navigation focus from animated subjects. Keep buttons named and
  keyboard-operable, with visible focus and an honest disabled state at boundaries.
- In reduced/off mode, apply the destination immediately. If fragments hide
  essential content, provide a reading view that exposes the complete final deck.
- Source HTML must remain readable without JavaScript; hide preparatory states only
  after the controller has initialized successfully.
- Keep notes private when needed. Audience sync is optional: never add a network
  service, account or cross-origin channel without an explicit need and approval.

## Review actual painted motion

Inspect each distinct mechanism in the real host:

| Action | Required result |
| --- | --- |
| Enter slide | Meaningful first hold, no flash of blank or stale content |
| Next | One proof state, then a stable hold |
| Previous | The exact prior semantic state |
| Jump / skip / restart | Destination only, no intermediate playback |
| Navigate during animation | Old animation canceled; destination wins |
| Change theme or motion mode | Legible target state, no lost navigation |
| Reduced motion / off / no script | Same information, no required animation |
| Narrow viewport and zoom | Labels fit and controls remain reachable |

Test the state reducer with every transition, invalid IDs and boundary cases.
Test interruption in a browser, not only JSON metadata. Check that animation
transforms do not detach labels or connectors and that accessibility names persist.
Report missing host capabilities explicitly; a motion plan is not a working player.

See [source and differences](./references/source.md).
