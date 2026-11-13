@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Update to the latest version first when this folder is a Git clone (e.g. GitHub Desktop).
where git >nul 2>nul
if not errorlevel 1 if exist "%~dp0..\.git" (
  echo 최신 버전을 확인합니다...
  git -C "%~dp0.." pull --ff-only
  if errorlevel 1 echo 업데이트하지 못했습니다. 지금 있는 버전으로 실행합니다.
)
where python >nul 2>nul
if errorlevel 1 (
  py -3 launch_trpg.py %*
) else (
  python launch_trpg.py %*
)
if errorlevel 1 pause
