# Mode-announce voices

The game plays a short robotic voice clip (Higgsfield TTS, deep male "Sterling")
when you switch difficulty on the menu.

By default `MODES[].voice` in `src/logic.js` points at the **hosted Higgsfield CDN
URLs**, so voices work without any files here.

To **self-host** them (recommended for permanence):

```bash
bash public/voice/fetch-voices.sh   # downloads easy.mp3, hard.mp3, ultra.mp3 here
```

then change each `voice` in `src/logic.js` MODES to the local path, e.g. `/voice/hard.mp3`.

`playVoice()` in `src/audio.js` fails silently if a clip can't load, so the game
always runs regardless.
