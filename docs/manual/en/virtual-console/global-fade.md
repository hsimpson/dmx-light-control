# Global fade

The **Global fade** control is a fader that sets one fade time for the whole console, from **Off** up to a maximum of 1 to 30 seconds that you choose. While it is above **Off**, every running sequence crossfades from step to step over that time, and buttons in **Flash** mode fade their channels in and out instead of switching at once.

## Contents

- [Add and configure the control](#add-and-configure-the-control)
- [Setting the fade time](#setting-the-fade-time)
- [What the fade time does](#what-the-fade-time-does)
  - [Sequences](#sequences)
  - [Flash buttons](#flash-buttons)
- [Example: slow down a chase](#example-slow-down-a-chase)
- [Limitations](#limitations)

## Add and configure the control

1. Open the **Virtual Console** tab.
2. Drag **Global fade** from **Add control** onto the canvas, then click it to select it.
3. Choose its **Orientation**: **Vertical** or **Horizontal**.
4. Choose its **Maximum fade time**, the fade time at the top of the fader: 1, 2, 5, 10 or 30 s. A new control starts at 5 s. The shorter the maximum, the more fader travel you get for short fades.
5. To use a fader or knob on a MIDI controller, choose it under **MIDI input**, as for a slider.
6. Click **Save**.

![The settings of a Global fade](images/global-fade-settings.png)

## Setting the fade time

Move the fader in the pop-out window (the **Pop out** icon in the **Console** panel) or turn the assigned MIDI control. The fader cannot be moved in the editor. It shows the fade time it sets:

- At the bottom it reads **Off**: nothing fades and every sequence keeps its own timing.
- The first step above **Off** is 25 ms and the top is the **Maximum fade time**. Below 0.10 s the fader shows milliseconds.
- The scale is logarithmic, so short fades are easy to set precisely. With a 5 s maximum the lower half of the fader covers 25 ms to about 0.35 s; with 30 s it reaches about 0.8 s.
  ![A Global fade set to 0.34 s](images/global-fade-control.png)

All Global fade controls in the project set the same fade time, each over its own range. The one you moved last wins. For example, a 2 s fader for chases and a 30 s fader for slow scene changes can sit side by side. When you change the **Maximum fade time** of a control, the new range applies the next time you move its fader. The fade time is **Off** after a restart and when you switch to another project. It also goes back to **Off** when you delete a Global fade control.

## What the fade time does

### Sequences

While the fade time is above **Off**, every step of every running sequence fades in over the fade time and has no fade out. The fade time never makes a step shorter than it is set in the sequence:

- If the fade time is shorter than a step, the step holds for the rest of its own length. The sequence keeps its speed, and the fade time only sets how soft each change is: a few milliseconds is almost a cut, half a second a smooth blend.
- If the fade time is longer than a step, the step lasts as long as the fade, so the sequence slows down. A fade is never cut short.

Fast chases come from the timing set in the sequence, or from a beat or a tap.

Also:

- It applies to sequences started by any button or control. A sequence that starts also fades its first step in from dark.
- When you move the fader, the step that is playing starts its fade again from the current look, so the light does not jump. While you keep moving the fader, the sequence stays on that step.
- A step moved on by a beat or a tap keeps the fade time it started with; a new fade time applies from the next beat or tap.
- A sequence stepped by the **Beat** bar of an [Audio triggers](audio-trigger.md) control, or by a [Global tap](global-tap.md), keeps the timing that follows the beat when **Timing** is set to **Follow beat**. With **From sequence**, its steps use the fade time instead.
- Back at **Off**, every sequence plays with the timing set in the sequence again.

### Flash buttons

A button in **Flash** mode that drives channels fades up to its **Upper limit** over the fade time when you press it, and back down when you release it. If you release it before it has reached the limit, it fades down from where it is.

- The button shows as pressed at once; only its light fades.
- Buttons in **Toggle** mode, buttons that start a function, and sliders still change at once.

## Example: slow down a chase

1. Create a sequence, for example a four-step chase, and a button that starts it.
2. Add a **Global fade**, and save.
3. Open the pop-out window and start the chase. With the fader on **Off**, the chase runs with its own timing.
4. If the chase steps every second, raise the fader to about 0.5 s: the chase keeps its speed, and each step now blends smoothly into the next. Raise it to about 2 s: the fades get longer than the steps, so the chase slows to one step every 2 seconds.
5. Pull the fader back to **Off**: the chase runs at its own speed again.

## Limitations

- A sequence that stops goes dark at once; the fade time does not fade it out.
- If the fade time is at least as long as the last step of a **Single shot** sequence, the sequence ends as soon as that step has faded in, so its last look is only reached for a moment.
- The fade time is not saved: it is **Off** after every restart.
- The fade time applies to every running sequence. It has no setting to limit it to some of them.
