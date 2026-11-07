# Audio triggers

The **Audio triggers** control makes your lights react to sound. It measures the input signal as one **Volume** bar plus up to 16 frequency bands. Each bar can do one of two things:

- set the level of DMX channels, for example a dimmer that follows the bass
- start and stop a function, for example a sequence that runs during loud passages

A separate **Beat** bar detects the kick drum and steps a sequence forward on each beat, so the lights stay in time with the music.

The sound analysis runs on the server, so the lights keep reacting when you close the browser window.

## Contents

- [Before you start](#before-you-start)
- [Add and configure the control](#add-and-configure-the-control)
- [Turn it on](#turn-it-on)
  - [Reading the display](#reading-the-display)
- [How the thresholds work](#how-the-thresholds-work)
  - [Channels](#channels)
  - [Function](#function)
  - [What the percentages mean](#what-the-percentages-mean)
- [Beat](#beat)
  - [What counts as a beat](#what-counts-as-a-beat)
  - [How the sequence plays](#how-the-sequence-plays)
- [Example: bass on a dimmer, sequence on loud passages](#example-bass-on-a-dimmer-sequence-on-loud-passages)
- [Example: a chase on every kick](#example-a-chase-on-every-kick)
- [Frequency range](#frequency-range)
  - [What the limits leave out](#what-the-limits-leave-out)
  - [How the bands are divided](#how-the-bands-are-divided)
  - [Choosing a band count](#choosing-a-band-count)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)

## Before you start

The control needs a sound input in the project:

1. Open the project's **Input/Output** tab.
2. Under **Sound input**, tick **Use** for your device. A project can use one sound input.
3. Choose **Mono** or **Stereo**. Both channels of a stereo input are mixed together for the analysis.
4. Play some music and check that the level meter moves.

## Add and configure the control

1. Open the **Virtual Console** tab.
2. Drag **Audio triggers** from **Add control** onto the canvas, then click it to select it.
3. Set **Bands** to the number of frequency bands you want (1 to 16, default 8).
4. Pick a bar under **Bar**. The list shows **Volume**, each band with its frequency range, and **Beat** at the end. **Beat** works differently, see [Beat](#beat).
5. Choose what the bar controls under **Drives**:
   - **Nothing:** the bar only displays its level.
   - **Channels:** select the fixture channels in the panel that opens next to the console.
   - **Function:** select the function in the same panel.
6. Set **Min threshold (%)** and **Max threshold (%)** for that bar (default 20 and 80).
7. Repeat steps 4 to 6 for each bar you want to use, then click **Save**.

The lights only use saved settings. **Bands** and the thresholds apply when you press Enter or leave the field.

> **Changing the band count:** bars keep their settings by number, but the frequency ranges are recalculated, so Band 3 may now cover different frequencies. Reducing the count also deletes the settings of the bands that are removed.

## Turn it on

The control is **off** when the server starts and when you switch to another project, so sound never takes over your lights unasked.

To switch it, use one of these:

- **Pop-out window:** click the **Pop out** icon in the **Console** panel, then click the control's toggle. The toggle cannot be clicked in the editor.
- **MIDI:** choose an entry under **MIDI input**. The controller's mapping must first be assigned on the **Input/Output** tab. If the entry has LED feedback, its LED shows whether the control is on.

Each press switches between on and off. Turning it off stops everything the control started.

### Reading the display

Each bar is labelled **V** for Volume or with its band number. The two lines on a bar mark its min and max thresholds. The last bar, **B**, jumps to full on each beat and then falls back. The bars only move while the control is on.

Levels are smoothed: they rise within about 40 ms and fall over about 200 ms, so lights follow hits without flickering.

## How the thresholds work

The thresholds mean different things depending on what the bar drives.

### Channels

| Bar level           | DMX value                  |
| ------------------- | -------------------------- |
| At or below min     | 0                          |
| Between min and max | Rises evenly from 0 to 255 |
| At or above max     | 255                        |

Raising the min ignores quiet sound. Lowering the max reaches full brightness sooner. A closer pair of thresholds makes the light behave more like a switch.

If another control, or a running function, sets the same channel, the higher value wins.

### Function

- The function **starts** when the bar reaches the max threshold.
- It **stops** when the bar falls below the min threshold.
- Between the two thresholds, nothing changes. The gap keeps the function from switching on and off rapidly, so make it wider if that happens.

If the function was already running, for example from a button, the bar does not start or stop it.

If several bars use the same function, the first one to reach its max starts it, and it stops once all of them have fallen below their min.

### What the percentages mean

The scale is in decibels, not linear: 0 % is −60 dB and 100 % is 0 dB, which is a full-scale signal. So 50 % means −30 dB, not half as loud, and the default thresholds of 20 and 80 % correspond to −48 dB and −12 dB.

A single band holds only part of the signal, so it often reads lower than **Volume**. Band thresholds may need to be lower than Volume thresholds.

## Beat

The **Beat** bar steps a sequence by one step on each beat. Select **Beat** under **Bar**, then select the sequence in the panel next to the console. It has no **Drives** or **Max threshold (%)**, only **Min threshold (%)** (default 20). To unbind the sequence, click **Clear function**.

When you turn the control on, the sequence is armed and stays dark until the first beat.

### What counts as a beat

- The control listens to the bass range from 40 to 150 Hz, where the kick drum sits. Hi-hats, snares and vocals do not count.
- A beat is a sudden rise in that range compared with the last 1.5 seconds. A sustained bass note does not repeat beats, and the detection adapts to loud and quiet songs.
- Beats are at least 180 ms apart (about 333 BPM), so one kick never counts twice.
- **Min threshold (%)** ignores beats whose bass level is below it, on the same scale as the other bars. Raise it if quiet sounds step the sequence.

### How the sequence plays

- Each beat plays the next step once, with that step's own fade in, hold and fade out.
- If the next beat comes before the step has finished, the next step starts at once and fades from the current look.
- If beats come slower than the step, a step with a fade out goes dark until the next beat. A step with a fade out of 0 holds its look.
- The sequence's **Direction** and **Run order** apply. With **Single shot**, it stops after its last step.
- In silence there are no beats, so the lights go dark or hold their last look, as above.
- Turning the control off stops the sequence.

If the sequence was already running when you turned the control on, for example from a button, it keeps its own speed and ignores the beats.

> **Use a separate sequence for Beat.** If a level bar and the Beat bar use the same sequence, whichever starts it first decides how it plays: a level bar starts it at its own speed, so beats are ignored.

## Example: bass on a dimmer, sequence on loud passages

1. Select the control and set **Bar** to the lowest band, then **Drives** to **Channels**. Select the dimmer channels of your fixtures.
2. Make sure those fixtures also have a colour set, for example from a slider or another function. A dimmer alone may not produce light.
3. Set **Bar** to **Volume**, then **Drives** to **Function**, and select a sequence.
4. Click **Save**, open the pop-out window and turn the control on.
5. Play music and watch the bars. Adjust the thresholds so the bass bar crosses them on each hit, and Volume passes its max only on the loud passages.

## Example: a chase on every kick

1. Create a sequence whose steps are short, for example a fade in of 0 ms, a hold of 100 ms and a fade out of 150 ms, with a different fixture or colour in each step.
2. Select the control, set **Bar** to **Beat** and select the sequence.
3. Click **Save**, open the pop-out window and turn the control on.
4. Play music with a clear kick drum. Each kick flashes the next step. If quiet sounds also step it, raise **Min threshold (%)**.

Steps with long fades look sluggish when beats are fast, so keep them shorter than the time between two beats (500 ms at 120 BPM).

## Frequency range

The control analyses sound from **40 Hz to 16 kHz**. This covers almost everything that matters for making lights follow music, although it is narrower than the full audio range of about 20 Hz to 20 kHz.

The **Volume** bar is not divided by frequency: it follows the overall level of the input signal.

### What the limits leave out

- **Below 40 Hz:** mostly sub-bass and rumble. Very deep sub-bass in electronic music or hip-hop can reach about 30 Hz and may barely register in the lowest band, but the harmonics of those notes still show up in the bands above it.
- **Above 16 kHz:** mostly "air", with little energy in it. Lossy formats such as MP3 often cut this range off anyway.

### How the bands are divided

The range is divided logarithmically, so each band covers the same musical interval. Low bands are therefore narrow in Hz and high bands are wide.

With 8 bands, the range is divided as follows:

| Band | Range            | Typical content (approximate)          |
| ---- | ---------------- | -------------------------------------- |
| 1    | 40 – 85 Hz       | Kick drum, bass                        |
| 2    | 85 – 179 Hz      | Kick drum, bass                        |
| 3    | 179 – 378 Hz     | Snare body, lower mids                 |
| 4    | 378 – 800 Hz     | Vocals, instruments                    |
| 5    | 800 Hz – 1.7 kHz | Vocals, instruments                    |
| 6    | 1.7 – 3.6 kHz    | Upper mids, attack of drums and vocals |
| 7    | 3.6 – 7.6 kHz    | Hi-hats, cymbals                       |
| 8    | 7.6 – 16 kHz     | Hi-hats, cymbals, "air"                |

Instruments do not stay inside one band, so use the table as a starting point and watch the live bars while music is playing.

### Choosing a band count

The bands do not follow musical categories, and a low band count blurs them further. With 3 bands, for example, the lowest band covers 40 – 295 Hz. That works well for "bass", but it cannot separate the kick drum from the bass.

## Troubleshooting

| Problem                                      | What to check                                                                                                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The bars do not move                         | Is the control on? Does the level meter on the **Input/Output** tab move?                                                                                                                                 |
| The bars move but the lights do not react    | Did you click **Save**? Is **Drives** set and a channel or function selected? Does the level reach the min threshold?                                                                                     |
| The channel moves but the fixture stays dark | The fixture may also need a colour or its master dimmer set.                                                                                                                                              |
| The lights are always at full                | The max threshold is too low, or the input is too loud. There is no gain setting in the control, so lower the level at the source.                                                                        |
| The lights barely react                      | Lower the thresholds, or raise the level at the source.                                                                                                                                                   |
| A function switches on and off rapidly       | Widen the gap between the min and max thresholds.                                                                                                                                                         |
| A function does not stop                     | The bar has not fallen below its min threshold, another bar still holds the function, or it was already running when the bar reached its max.                                                             |
| Beats do not step the sequence               | Is a sequence selected for **Beat**? Does the **B** bar move? If it moves only a little, lower **Min threshold (%)**. If the sequence was already running, stop it and turn the control off and on again. |
| A low band stays dark                        | Check the input first. A line-in or a microphone can lose low frequencies: a small microphone may pick up little below 80 – 100 Hz.                                                                       |

## Limitations

- **Beat** reacts to each kick and does not track the tempo: there is no BPM display, and no beats come through breaks without a kick.
- Bass notes can also count as beats, and the first kick after a break or a sudden drop in level can be missed.
- A sequence that a level bar starts runs at its own speed, so it can drift against the music.
- The frequency range and smoothing are fixed.
- The toggle works with a mouse, touch or MIDI, but not with the keyboard.
