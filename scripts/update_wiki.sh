#!/usr/bin/env bash

# Helper script for staff to update the wiki data used by the website.
# It assumes the hd-wiki source repository is located at ../hd-wiki relative to this site repo.
# The extraction script `extract_wiki.py` must be present in the project root.

set -euo pipefail

# Update hd-wiki source if present
if [ -d "../hd-wiki" ]; then
  echo "Updating hd-wiki repository..."
  (cd ../hd-wiki && git pull --ff-only)
else
  echo "Warning: ../hd-wiki not found – you may need to clone it manually."
fi

# Run the extraction script to regenerate static/js/wiki-data.js
echo "Running wiki extraction..."
python3 extract_wiki.py

# Stage and commit the changes
git add static/js/wiki-data.js
git commit -m "Update wiki data $(date +%Y-%m-%d)"

echo "Wiki data updated and committed."
