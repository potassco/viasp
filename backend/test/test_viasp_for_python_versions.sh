#!/usr/bin/env bash
# Run pytest across all clingo-py3.X conda environments.
# Automatically creates missing environments and installs dependencies.
# Usage: ./test_all_pythons.sh [pytest args...]
#   e.g. ./test_all_pythons.sh -k test_control_api -x
set -u

source "$(conda info --base)/etc/profile.d/conda.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

ENVS=(clingo-py3.9 clingo-py3.10 clingo-py3.11 clingo-py3.12 clingo-py3.13 clingo-py3.14)

# Check for system graphviz (required by clingraph)
if ! command -v dot &>/dev/null; then
    echo "WARNING: graphviz (dot) not found on PATH. clingraph requires it."
    echo "         Install with: sudo dnf install graphviz  (or apt install graphviz)"
    echo
fi

env_exists() {
    conda env list | grep -qE "^$1 "
}

ensure_env() {
    local env="$1"
    local pyver="${env#clingo-py}"

    if ! env_exists "$env"; then
        echo "--- Creating conda environment $env (Python $pyver) ---"
        conda create -n "$env" "python=$pyver" -y
        conda install -n "$env" -c conda-forge clingo -y
    fi

    conda activate "$env" || return 1

    if ! pip show viasp-backend &>/dev/null; then
        echo "--- Installing viasp packages into $env ---"
        pip install -r "$REPO_ROOT/requirements.txt"
        pip install -e "$REPO_ROOT"
        pip install -e "$REPO_ROOT/backend"
        pip install -e "$REPO_ROOT/frontend"
    fi
}

declare -A RESULTS
for env in "${ENVS[@]}"; do
    echo "=============================================="
    echo "=== $env"
    echo "=============================================="
    ensure_env "$env" || { RESULTS[$env]="SETUP FAIL"; continue; }
    python --version
    PYTHONPATH=src pytest test "$@"
    RESULTS[$env]=$?
    conda deactivate
done

echo
echo "=============================================="
echo "Summary"
echo "=============================================="
for env in "${ENVS[@]}"; do
    printf "  %-16s %s\n" "$env" "${RESULTS[$env]}"
done
