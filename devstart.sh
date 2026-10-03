#!/bin/bash

if command -v bundle &> /dev/null && [ -f "Gemfile" ]; then
  bundle exec jekyll serve
else
  npm run dev
fi
