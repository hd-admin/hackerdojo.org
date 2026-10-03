# HackerDojo.org

This is the website for Hacker Dojo. It is a collaborative hackerspace where tech enthusiasts gather to build, experiment and improve.

## Wiki Update Guide

This repository builds the HackerDojo website from static files and a JSON data file that contains the wiki content. Staff can update the wiki without digging into the site’s build process by following these steps:

1. **Edit the source wiki** – The raw wiki pages live in the sibling repository `hd-wiki` (located at `../hd-wiki`). Open the relevant HTML or Markdown file and make your changes.
2. **Generate the JSON data** – Run the extraction script that ships with this project:
   ```bash
   cd /home/zmillet/Documents/Web/hackerdojo.org
   python3 extract_wiki.py
   ```
   This script reads the updated wiki files and rewrites `static/js/wiki-data.js`.
3. **Commit the changes** – Stage the regenerated `wiki-data.js` and commit:
   ```bash
   git add static/js/wiki-data.js
   git commit -m "Update wiki data $(date +%Y-%m-%d)"
   ```
4. **Push & rebuild** – Push the commit to the remote repository. The CI pipeline (or your local Jekyll server) will rebuild the site automatically.

### Quick‑run helper script
For convenience, a small helper script `scripts/update_wiki.sh` is provided. It pulls the latest `hd-wiki` source (if present), runs the extractor, stages the JSON file, and creates a standard commit.

```bash
./scripts/update_wiki.sh
```

Make sure the script is executable (`chmod +x scripts/update_wiki.sh`).

# Setup

This project uses [Jekyll](https://jekyllrb.com/) which relies on [Ruby](https://www.ruby-lang.org/)
to build the website's codebase.

## Installation

- [Install Ruby 3+](https://www.ruby-lang.org/en/documentation/installation/)
- `gem install jekyll bundler`

### Usage

Once all pre-requisites are installed, you can preview the website using:

```sh
jekyll serve
```

## Silent Auction MVP (Planning)

See [docs/auction](./docs/auction).
