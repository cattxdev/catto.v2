# Creative Bans — Audio Assets

Place the following OGG/Opus audio files in this directory. They are played by the
bot in voice channels during creative ban sequences.

## Required Files

| File                   | Duration | Description                                    |
| ---------------------- | -------- | ---------------------------------------------- |
| `air-raid.ogg`         | ~5 s     | Air-raid siren (rising/falling wail)           |
| `missile-fly.ogg`      | ~3 s     | Missile whoosh / fly-by                        |
| `explosion.ogg`        | ~3 s     | Explosion boom                                 |
| `emergency-meeting.ogg`| ~3 s     | Among Us emergency meeting button sound        |
| `ejection.ogg`         | ~3 s     | Among Us ejection / airlock hiss               |

## Format

- **Codec:** Opus (inside OGG container) — Discord's native codec.
- **Sample rate:** 48 kHz stereo preferred.
- **Bitrate:** 96–128 kbps is plenty.

You can convert with ffmpeg:
```bash
ffmpeg -i input.mp3 -c:a libopus -b:a 96k -ar 48000 output.ogg
```

## Sourcing

Use royalty-free SFX sites (freesound.org, pixabay.com/sound-effects, etc.)
or generate them with a sound design tool. **Do not commit copyrighted audio.**
