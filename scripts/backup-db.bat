@echo off
rem Double-clickable wrapper for backup-db.ps1 (see that file for options
rem and how to schedule it as a daily task).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-db.ps1" %*
pause
