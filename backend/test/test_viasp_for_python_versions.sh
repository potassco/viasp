#!/bin/bash

# This script tests the viasp package with different Python versions.
# Run by specifying interactive mode, e.g.:
# bash -l example.sh or zsh -i example.sh

LOGFILE="viasp_test.log"
PYTHON_VERSIONS=("3.8" "3.9" "3.10" "3.11" "3.12" "3.13")
FAILURES=0

for pv in "${PYTHON_VERSIONS[@]}"; do
  ENV_NAME="testv230p$pv"
	echo "Testing Python $pv..." >> "$LOGFILE"
	echo "-------------------------------" >> "$LOGFILE"
  
  conda create -n testv230p$pv python=$pv --yes
  
  if ! conda activate testv230p$pv >> "$LOGFILE" 2>&1; then
    echo "Python $pv: ❌ Failed to activate environment"
    ((FAILURES++))
    continue
  fi
	echo "Installing packages..." >> "$LOGFILE"
  
  conda install pip --yes >> "$LOGFILE" 2>&1

	if ! pip install -q viasp >> "$LOGFILE" 2>&1; then
    echo "Python $pv: ❌ Package installation failed"
    ((FAILURES++))
    continue
  fi
  echo "Installation complete." >> "$LOGFILE"

  # EXECUTION: Run viasp
  echo "Running viasp..." >> "$LOGFILE"
  which viasp >> "$LOGFILE"
  echo >> "$LOGFILE"
  echo "a. {b}:-a." | viasp - 0 >> "$LOGFILE" 2>&1 &
  VIASP_PID=$!
  echo "Started viasp with PID $VIASP_PID"  >> "$LOGFILE"
  echo "Using viasp at $(which viasp)"  >> "$LOGFILE"

  sleep 30

  # ASSERTION: Check if it's still running
  if ps -p $VIASP_PID > /dev/null; then
    echo "Python $pv: ✅ viasp ran successfully"
    kill $VIASP_PID
    wait $VIASP_PID 2>/dev/null
  else
    echo "Python $pv: ❌ viasp failed or exited early"
    ((FAILURES++))
  fi
	viasp --reset
  conda deactivate
  conda remove -n testv230p$pv --all --yes
done

echo
echo "viasp test completed. Log saved to $LOGFILE"
if [[ $FAILURES -gt 0 ]]; then
  echo "$FAILURES test(s) failed."
  exit 1
else
  echo "All tests passed successfully."
  exit 0
fi