@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  py -3 launch_trpg.py %*
) else (
  python launch_trpg.py %*
)
if errorlevel 1 pause
