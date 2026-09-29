# Project Tasks: Rent vs. Buy Delta Calculator

## Task List

- [x] **Phase 1: Environment & Project Foundation**
  - [x] **Task 1.1 [Build]**: Initialize project structure, `requirements.txt` (`flask`, `pytest`, `gunicorn`), and virtual environment. *(Skill: Python / Bash)*
  - [x] **Task 1.2 [Validate]**: Verify environment activation, dependency resolution, and clean execution. *(Skill: Bash)*

- [x] **Phase 2: Python Financial Engine & Test Suite**
  - [x] **Task 2.1 [Build]**: Implement `api/calculator.py` containing mortgage amortization, S&P 500 compounding, renter deficit liquidation, and net worth trajectory calculations. *(Skill: `test-driven-development`)*
  - [x] **Task 2.2 [Validate]**: Create and run `tests/test_calculator.py` verifying standard cases, boundary conditions (zero down, high rates, 30-year mortgage payoff). *(Skill: `test-driven-development`)*

- [x] **Phase 3: JavaScript Client Engine & Cross-Engine Parity Gate**
  - [x] **Task 3.1 [Build]**: Implement `static/js/calculator.js` mirroring the exact financial equations for client-side evaluation. *(Skill: `test-driven-development`)*
  - [x] **Task 3.2 [Validate]**: Create `tests/test_parity.py` running parity assertions between Python and JavaScript engines across diverse parameter vectors. *(Skill: `test-driven-development`)*

- [x] **Phase 4: Flask Backend & Serverless API**
  - [x] **Task 4.1 [Build]**: Implement `api/index.py` exposing `GET /` (Jinja2 SSR with query param hydration) and `POST /api/calculate`. *(Skill: Python / Flask)*
  - [x] **Task 4.2 [Validate]**: Execute route tests verifying SSR query string pre-filling and API JSON output. *(Skill: Pytest)*

- [x] **Phase 5: Responsive UI, Chart.js & Stateless URL Sync**
  - [x] **Task 5.1 [Build]**: Build `templates/index.html` with Tailwind CSS, 5 synchronized sliders, horizon toggle (5–30 yrs), Chart.js net worth canvas, winner hero badge, and milestone cards. *(Skill: `antigravity-design-expert`)*
  - [x] **Task 5.2 [Validate]**: Test 60 FPS slider reactivity, Chart.js re-renders, URL query parameter bookmarking/sharing, and mobile responsiveness. *(Skill: UI Verification)*

- [x] **Phase 6: Vercel Deployment & Git Finalization**
  - [x] **Task 6.1 [Build]**: Configure `vercel.json` for WSGI serverless routing and finalize project README. *(Skill: DevOps)*
  - [x] **Task 6.2 [Validate]**: Run full test suite (`pytest`), verify git status, commit, and push to `origin/main`. *(Skill: GitOps)*
