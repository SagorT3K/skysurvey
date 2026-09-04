#!/usr/bin/env bash
# One-time setup for an Ubuntu VPS, written for Oracle Cloud's Always Free tier.
#
#   curl -fsSL https://raw.githubusercontent.com/SagorT3K/skysurvey/main/scripts/vps-setup.sh | bash
#
# Installs Docker, opens the web ports at the OS level, and adds swap so a
# Next.js build survives on a small instance. It does not deploy the app; run
# `docker compose up -d --build` afterwards.
set -euo pipefail

log() { printf '\n==> %s\n' "$1"; }

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

log "Installing Docker"
if command -v docker >/dev/null 2>&1; then
  echo "Docker already present: $(docker --version)"
else
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq ca-certificates curl git
  $SUDO install -m 0755 -d /etc/apt/keyrings
  $SUDO curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  $SUDO chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  $SUDO usermod -aG docker "$USER" || true
  echo "Added $USER to the docker group — log out and back in for it to apply."
fi
log "Opening TCP 80 and 443 on the host firewall"
# Oracle's Ubuntu images ship an iptables INPUT chain that allows only TCP 22 and
# ends in a REJECT. Two traps here:
#   - `-A` appends AFTER that REJECT, so the rule silently never matches. Insert
#     before the REJECT line instead.
#   - Do not use ufw on an OCI Ubuntu image; Oracle warns it can leave the
#     instance unable to boot. Never run `iptables -F` either — that drops the
#     iSCSI rules protecting the boot volume.
if command -v iptables >/dev/null 2>&1; then
  REJECT_LINE=$($SUDO iptables -L INPUT --line-numbers -n | awk '/REJECT/{print $1; exit}')
  for port in 80 443; do
    if $SUDO iptables -C INPUT -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
      echo "port $port already allowed"
    elif [ -n "$REJECT_LINE" ]; then
      $SUDO iptables -I INPUT "$REJECT_LINE" -m state --state NEW -p tcp --dport "$port" -j ACCEPT
      echo "port $port inserted at line $REJECT_LINE"
    else
      $SUDO iptables -I INPUT -m state --state NEW -p tcp --dport "$port" -j ACCEPT
      echo "port $port inserted (no REJECT rule found)"
    fi
  done
  $SUDO apt-get install -y -qq iptables-persistent >/dev/null 2>&1 || true
  $SUDO netfilter-persistent save >/dev/null 2>&1 \
    || $SUDO sh -c 'iptables-save > /etc/iptables/rules.v4' \
    || echo "WARNING: could not persist rules; they will be lost on reboot"
else
  echo "iptables not found, skipping host firewall step"
fi

log "Adding swap"
# The Always Free AMD shape has 1 GB of RAM, which is not enough for `next build`.
# Harmless on the 12 GB Ampere shape.
if [ -f /swapfile ] || swapon --show | grep -q .; then
  echo "swap already configured"
else
  $SUDO fallocate -l 2G /swapfile || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048
  $SUDO chmod 600 /swapfile
  $SUDO mkswap /swapfile >/dev/null
  $SUDO swapon /swapfile
  echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
  echo "2 GB swap enabled"
fi

log "Done"
cat <<'NEXT'
Remaining steps:

  1. In the OCI console, add ingress rules for TCP 80 and 443 to the subnet's
     security list. The host firewall above is only half of it — without the VCN
     rule the traffic never reaches this machine.

  2. Deploy:
       git clone https://github.com/SagorT3K/skysurvey.git && cd skysurvey
       cp .env.example .env      # set JWT_SECRET, ADMIN_PASSWORD, DOMAIN
       docker compose up -d --build
NEXT

