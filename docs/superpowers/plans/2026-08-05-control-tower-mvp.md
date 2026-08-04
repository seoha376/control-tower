# Control Tower MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable personal dashboard that tracks websites, AdSense review status, deployment state, and revenue in one place.

**Architecture:** A dependency-free static web app stores project records in browser localStorage and renders summary cards plus an editable service table. Pure domain functions live in a separate ES module and are covered by Node's built-in test runner.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules, Node.js built-in test runner, GitHub Pages.

## Global Constraints

- The MVP must run without paid infrastructure or external API credentials.
- AdSense status and revenue are manually editable in this version.
- Data must persist in the browser with localStorage.
- The project must be deployable through GitHub Pages.

---

### Task 1: Domain calculations

**Files:**
- Create: `src/domain.js`
- Test: `tests/domain.test.js`

**Interfaces:**
- Produces: `calculateSummary(projects)`, `normalizeProject(input)`, `getStatusLabel(status)`.

- [ ] Write failing tests for totals, status counts, and project normalization.
- [ ] Run `node --test` and confirm missing-module failure.
- [ ] Implement the minimal domain functions.
- [ ] Run `node --test` and confirm all tests pass.

### Task 2: Dashboard interface

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/app.js`

**Interfaces:**
- Consumes: domain functions from `src/domain.js`.
- Produces: editable dashboard UI backed by localStorage.

- [ ] Add summary cards and project table markup.
- [ ] Add responsive styling.
- [ ] Add create, edit, delete, filter, and persistence behavior.
- [ ] Verify the app loads through a local static server.

### Task 3: Deployment and documentation

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `README.md`
- Create: `package.json`

**Interfaces:**
- Produces: one-command local serving instructions and GitHub Pages deployment.

- [ ] Add test and serve scripts.
- [ ] Add GitHub Pages workflow.
- [ ] Document setup, limitations, and future API integration.
- [ ] Run tests and inspect generated files.
