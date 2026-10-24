# COMPX310 Final Test Trainer

An unofficial study tool for the **COMPX310 Machine Learning (University of Waikato) final test**. It's built from the 12 weeks of lecture slides and the past tests.

**Live site: https://officialprotondev.github.io/COMPX310-Final-Test-Trainer/**

## What's in it

- **499 multiple-choice practice questions.** 343 are written from the slides and 156 come from the past papers. Smart mix asks each week in the same share as the test (about a third from Weeks 1–6) and leans towards your weak topics. A question you get wrong comes back a few questions later.
- **Timed mocks in the real format.** 40 multiple choice plus 2 written answers in 50 minutes, with the test's week mix. There's also a quick 20-question version and a multiple-choice-only version. Results are broken down by week.
- **Four past papers:** the 2019 exam (the practice test), the 2025 and 2024 Test 1s, and the 2019 mock. You can answer as you go or show every answer. Where an official key disagrees with the slides, both answers are shown with a note.
- **30 written prompts**, mixing explanations and worked problems. Each has a mark scheme, a self-mark checklist and a model answer.
- **28 interactive visuals**, each opening on the lecture's own example: k-NN, Gini, precision/recall, gradient descent, voting, OOB, AdaBoost, gradient boosting, the SVM street, γ and C, Bayesian slopes, Gaussian processes, PCA, k-means, DBSCAN, attention, fairness and more.
- **A cheat-sheet builder** for the one double-sided A4 sheet allowed in the test. It puts your weak topics first, then shares the space between weeks by how many test questions each week gets. **Print now** or **Download** gives exactly two A4 pages.

## Good to know

- **Progress stays in your browser.** Answers, mocks and drafts are kept in this browser's local storage and never leave it, so use the same browser each time.
- **"Ask Claude" buttons open claude.ai in a new tab.** Your question or highlighted text is filled in and also copied to your clipboard. "Have Claude mark it" does the same for a written answer and its mark scheme. You need a Claude account for these. Everything else works without one.
- **Some answers are ours.** There's no official key for the 2019 exam or the 2024 Test 1, so those answers were worked out against the slides. The 2025 Test 1 and 2019 mock keys are the lecturer's.
- **No calculator in the test.** Every calculation here can be done by hand, and any log or exponential value needed is given in the question.

## Development

```sh
npm ci
npm test          # content checks (every question's schema and key) and the visuals' numeric checks
npm run build     # dist/site/index.html: the self-contained page that gets published
```

The app is Preact, bundled by esbuild into a single HTML file. Content lives in `src/data`: questions in `q/`, written prompts in `written/`, past papers in `papers/` and cheat-sheet boxes in `cheat/`. Every push to `main` runs the checks, builds the page and deploys it to GitHub Pages through `.github/workflows/pages.yml`.

Not affiliated with or endorsed by the University of Waikato.
