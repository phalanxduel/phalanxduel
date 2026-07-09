#!/usr/bin/env bash
# scripts/docs/show-help.sh
# Prints a quick summary of the most useful NPM scripts, and directs the user to the full markdown file.

set -eu

echo -e "\033[1;36mPhalanx Duel - Available Tooling Scripts\033[0m"
echo -e "Use \033[1;33mpnpm <script>\033[0m to run these commands."
echo ""
echo -e "\033[1mCore Lifecycle:\033[0m"
echo "  build            Build all workspace packages"
echo "  check            Run the Unified System Check (build, lint, typecheck, test)"
echo "  test             Run the standardized test suite across all workspaces"
echo "  fix              Auto-heal code formatting and styling (eslint, prettier, taplo)"
echo ""
echo -e "\033[1mDevelopment:\033[0m"
echo "  dev:server       Start the API server"
echo "  dev:client       Start the React client"
echo "  dev:admin        Start the Admin UI"
echo "  services         Manage all backend/frontend services (start, stop, logs)"
echo ""
echo -e "\033[1mQuality Assurance:\033[0m"
echo "  qa:playthrough   Run headless simulated bot matches against the engine"
echo "  qa:visual:run    Run Playwright visual regression tests"
echo "  verify:full      Run the exhaustive CI validation suite in Docker"
echo ""
echo -e "\033[1mDeployment & Environments:\033[0m"
echo "  deploy:production  Deploy the current branch to Fly.io Production"
echo "  deploy:staging     Deploy the current branch to Fly.io Staging"
echo ""
echo -e "For a complete list of commands and detailed instructions, read:"
echo -e "  \033[4;34mdocs/reference/pnpm-scripts.md\033[0m"
echo ""
