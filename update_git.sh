#!/bin/bash
cd /opt/whisperflow
git pull origin main
git add .
git commit -m "Авто-коммит $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
