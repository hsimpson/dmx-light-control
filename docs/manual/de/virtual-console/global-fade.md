# Globale Fade-Zeit

Das Steuerelement **Globale Fade-Zeit** ist ein Fader, der eine Fade-Zeit für die ganze Konsole festlegt, von **Aus** bis 30 Sekunden. Solange er über **Aus** steht, blendet jede laufende Sequenz in dieser Zeit von Schritt zu Schritt über, und Taster im Modus **Flash** blenden ihre Kanäle ein und aus, statt sofort zu schalten.

## Inhalt

- [Steuerelement hinzufügen und einrichten](#steuerelement-hinzufügen-und-einrichten)
- [Fade-Zeit einstellen](#fade-zeit-einstellen)
- [Was die Fade-Zeit bewirkt](#was-die-fade-zeit-bewirkt)
  - [Sequenzen](#sequenzen)
  - [Flash-Taster](#flash-taster)
- [Beispiel: ein Lauflicht verlangsamen](#beispiel-ein-lauflicht-verlangsamen)
- [Einschränkungen](#einschränkungen)

## Steuerelement hinzufügen und einrichten

1. Öffnen Sie den Tab **Virtuelle Konsole**.
2. Ziehen Sie **Globale Fade-Zeit** aus **Steuerelement hinzufügen** auf die Arbeitsfläche und klicken Sie es an, um es auszuwählen.
3. Wählen Sie die **Ausrichtung**: **Vertikal** oder **Horizontal**.
4. Um einen Fader oder Drehregler eines MIDI-Controllers zu nutzen, wählen Sie ihn unter **MIDI-Eingang** aus, wie bei einem Schieberegler.
5. Klicken Sie auf **Speichern**.

## Fade-Zeit einstellen

Bewegen Sie den Fader im ausgekoppelten Fenster (Symbol **Auskoppeln** im Panel **Konsole**) oder drehen Sie das zugewiesene MIDI-Bedienelement. Im Editor lässt sich der Fader nicht bewegen. Er zeigt die Fade-Zeit an, die er einstellt:

- Ganz unten zeigt er **Aus**: Nichts blendet, und jede Sequenz behält ihr eigenes Timing.
- Die erste Stufe über **Aus** ist 0.10 s, ganz oben sind es 30 s.
- Die Skala ist logarithmisch: Die untere Hälfte des Faders reicht von 0.10 s bis etwa 1.7 s, damit sich kurze Fades genau einstellen lassen.

![Eine Globale Fade-Zeit auf 1.7 s](images/global-fade-control.png)

Alle Steuerelemente vom Typ Globale Fade-Zeit im Projekt stellen dieselbe Fade-Zeit ein. Das zuletzt bewegte gilt. Die Fade-Zeit steht nach einem Neustart und beim Wechsel in ein anderes Projekt auf **Aus**. Sie springt außerdem auf **Aus** zurück, wenn Sie ein Steuerelement vom Typ Globale Fade-Zeit löschen.

## Was die Fade-Zeit bewirkt

### Sequenzen

Solange die Fade-Zeit über **Aus** steht, blendet jeder Schritt jeder laufenden Sequenz in der Fade-Zeit ein, ohne Halten und ohne Ausblenden. Der nächste Schritt beginnt, sobald das Einblenden fertig ist, die Fade-Zeit ist also auch die Zeit zwischen den Schritten.

- Das gilt für Sequenzen, die von beliebigen Tastern oder Steuerelementen gestartet wurden. Eine Sequenz, die startet, blendet auch ihren ersten Schritt aus dem Dunkeln ein.
- Wenn Sie den Fader bewegen, beginnt der gerade laufende Schritt sein Einblenden vom aktuellen Bild aus neu, damit das Licht nicht springt. Solange Sie den Fader weiter bewegen, bleibt die Sequenz auf diesem Schritt.
- Ein Schritt, den ein Beat oder ein Tap weiterschaltet, behält die Fade-Zeit, mit der er begonnen hat; eine neue Fade-Zeit gilt ab dem nächsten Beat oder Tap.
- Eine Sequenz, die der **Beat**-Balken eines [Audio-Triggers](audio-trigger.md) oder ein [Globaler Tap](global-tap.md) weiterschaltet, behält das Timing, das dem Beat folgt, wenn **Timing** auf **Dem Beat folgen** steht. Mit **Aus der Sequenz** nutzen ihre Schritte stattdessen die Fade-Zeit.
- Zurück auf **Aus** spielt jede Sequenz wieder mit dem Timing, das in der Sequenz eingestellt ist.

### Flash-Taster

Ein Taster im Modus **Flash**, der Kanäle steuert, blendet beim Drücken in der Fade-Zeit bis zu seiner **Obergrenze** auf und beim Loslassen wieder ab. Lassen Sie ihn los, bevor er die Grenze erreicht hat, blendet er von dort aus ab.

- Der Taster zeigt sich sofort als gedrückt, nur sein Licht blendet.
- Taster im Modus **Umschalten**, Taster, die eine Funktion starten, und Schieberegler ändern sich weiterhin sofort.

## Beispiel: ein Lauflicht verlangsamen

1. Erstellen Sie eine Sequenz, zum Beispiel ein Lauflicht mit vier Schritten, und einen Taster, der es startet.
2. Fügen Sie eine **Globale Fade-Zeit** hinzu und speichern Sie.
3. Öffnen Sie das ausgekoppelte Fenster und starten Sie das Lauflicht. Mit dem Fader auf **Aus** läuft es mit seinem eigenen Timing.
4. Schieben Sie den Fader auf etwa 2 s: Jeder Schritt geht jetzt weich in den nächsten über, ein Schritt alle 2 Sekunden.
5. Ziehen Sie den Fader zurück auf **Aus**: Das Lauflicht läuft wieder in seinem eigenen Tempo.

## Einschränkungen

- Eine Sequenz, die stoppt, wird sofort dunkel; die Fade-Zeit blendet sie nicht aus.
- Eine Sequenz mit **Einmal** endet, sobald ihr letzter Schritt eingeblendet ist, ihr letztes Bild ist also nur kurz zu sehen.
- Die Fade-Zeit wird nicht gespeichert: Nach jedem Neustart steht sie auf **Aus**.
- Die Fade-Zeit gilt für jede laufende Sequenz. Sie lässt sich nicht auf einige davon beschränken.
