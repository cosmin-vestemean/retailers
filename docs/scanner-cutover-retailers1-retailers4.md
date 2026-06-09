# Scanner Cutover: retailers1 -> retailers4

## Context

- `retailers1` runs branch `main` and uses the legacy SFTP scanner.
- `retailers4` runs branch `feat/edi-safety-sftp-tests` and uses the new EDI scanner.
- Only one scanner may be active at a time. Otherwise both apps can consume or process the same provider files.

## Switches

### retailers1

`main` now guards the legacy scanner with:

```text
ENABLE_SFTP_SCANNER=true|false
```

Default on `main` is ON when the variable is missing, to preserve current production behavior. Set it explicitly before cutover.

### retailers4

The new scanner is already controlled by:

```text
ENABLE_SFTP_SCANNER=true|false
EDI_SCANNER=new|legacy|both
DO_RETRY_INTERVAL_MS=300000
```

For cutover use `EDI_SCANNER=new`.

## Preflight

1. Deploy this `main` change to `retailers1`.
2. Keep current behavior explicit:

```powershell
heroku config:set ENABLE_SFTP_SCANNER=true -a retailers1
heroku restart -a retailers1
```

3. Ensure `retailers4` is ready but off:

```powershell
heroku config:set ENABLE_SFTP_SCANNER=false EDI_SCANNER=new -a retailers4
heroku restart -a retailers4
```

4. Verify logs:

```powershell
heroku logs --tail -a retailers1
heroku logs --tail -a retailers4
```

Expected:

- `retailers1`: `[scanner] legacy SFTP scanner ENABLED`
- `retailers4`: `SFTP/EDI scanner DISABLED`

## Cutover

Dry run:

```powershell
.\scripts\cutover-scanner-to-retailers4.ps1
```

Execute after confirmation:

```powershell
.\scripts\cutover-scanner-to-retailers4.ps1 -Execute
```

This will:

1. Set `ENABLE_SFTP_SCANNER=false` on `retailers1`.
2. Restart `retailers1`.
3. Set `ENABLE_SFTP_SCANNER=true EDI_SCANNER=new` on `retailers4`.
4. Restart `retailers4`.

Expected logs:

- `retailers1`: `[scanner] legacy SFTP scanner DISABLED (ENABLE_SFTP_SCANNER=false)`
- `retailers4`: `[scanner] new EDI scanner ENABLED (multi-provider)`

## Rollback

Dry run:

```powershell
.\scripts\rollback-scanner-to-retailers1.ps1
```

Execute:

```powershell
.\scripts\rollback-scanner-to-retailers1.ps1 -Execute
```

This will:

1. Set `ENABLE_SFTP_SCANNER=false` on `retailers4`.
2. Restart `retailers4`.
3. Set `ENABLE_SFTP_SCANNER=true` on `retailers1`.
4. Restart `retailers1`.

## Validation Checklist

- `retailers1` and `retailers4` logs do not show active scanners at the same time.
- `/app/do` on `retailers4` shows bucket access OK.
- DO `retry/` is empty during normal operation or contains only failed DB-insert XMLs waiting for retry.
- New rows appear in `CCCSFTPXML` and move toward `SENT` on the active scanner app.