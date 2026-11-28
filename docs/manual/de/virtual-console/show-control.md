# Show

Das Steuerelement **Show** spielt eine Show aus dem [Show-Manager](../show-manager/show-manager.md) auf der virtuellen Konsole ab, wie ein Audio-Player: Abspielen, Pause, Stopp und eine Zeitleiste mit vergangener, gesamter und verbleibender Zeit und eine Schaltfläche je Cue. Machen Sie das Steuerelement im Editor größer, wachsen Schaltflächen, Zeiten und Zeitleiste mit.

![Ein Show-Steuerelement, während seine Show läuft](images/show-control.png)

## Inhalt

- [Steuerelement hinzufügen und einrichten](#steuerelement-hinzufügen-und-einrichten)
- [Abspielen](#abspielen)
- [Einschränkungen](#einschränkungen)

## Steuerelement hinzufügen und einrichten

1. Öffnen Sie den Tab **Virtuelle Konsole**.
2. Ziehen Sie **Show** aus **Steuerelement hinzufügen** auf die Arbeitsfläche und klicken Sie es an, um es auszuwählen.
3. Wählen Sie die Show unter **Show**.
4. Klicken Sie auf **Speichern**.

![Die Show eines Show-Steuerelements](images/show-control-settings.png)

Ohne Show zeigt das Steuerelement **Keine Show gewählt**.

## Abspielen

Nutzen Sie die Tasten im ausgekoppelten Fenster (das Symbol **Auskoppeln** im Bereich **Konsole**). Im Editor lassen sie sich nicht drücken.

- **Abspielen** startet die Show am Anfang; eine pausierte Show macht dort weiter, wo sie war.
- **Pause** hält Musik und Licht der Show an und behält die Position.
- **Stopp** beendet die Show.
- Ziehen oder klicken Sie auf der Zeitleiste oder bewegen Sie sie mit den Pfeiltasten, um zu springen: Die Show spielt ab der Stelle, an der Sie loslassen, auch wenn sie pausiert oder gestoppt ist.
- Die gelben Linien auf der Zeitleiste sind die [Cues](../show-manager/show-manager.md#cues) der Show. Darunter hat jeder Cue eine Schaltfläche mit seinem Namen; klicken Sie darauf, um die Show ab diesem Cue abzuspielen. Die Schaltfläche des zuletzt passierten Cues ist hervorgehoben.
- Läuft die Show oder ist sie pausiert, nennt **Als Nächstes: … in …** hinter den Zeiten den nächsten Cue und zählt bis zu ihm herunter.

Die Show läuft auf dem Server, daher zeigen alle offenen Konsolen, das ausgekoppelte Fenster und der Show-Manager dieselbe Position. Die Regeln der Wiedergabe stehen auf der Seite [Show-Manager](../show-manager/show-manager.md#show-abspielen).

## Einschränkungen

- Das Show-Steuerelement hat keinen MIDI-Eingang.
- Wird eine Show gelöscht, haben ihre Show-Steuerelemente danach keine Show mehr.
- Nach einem Projekt-Import behält ein Show-Steuerelement seine Show nur, wenn das Projekt diese Show schon hat, denn Shows werden nicht exportiert.
