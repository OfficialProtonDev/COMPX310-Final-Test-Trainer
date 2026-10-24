// Cheat-sheet block library for the COMPX310 final test (one double-sided A4 sheet, ~4 columns per side).
// Every block is self-contained; the app picks blocks by priority (weak topics first, then imp) until the sheet is full.
// Fields: id (w<week>-kebab), week, topic (key from ../topics.js), title (≤ 32 chars),
//   imp (3 = very likely tested / easy to confuse, 2 = useful, 1 = nice to have),
//   kind ('rule' | 'facts' | 'formula' | 'table' | 'code' | 'compare' | 'qa' | 'worked'),
//   html (only <b> <i> <code> <sub> <sup> <br> <ul>/<ol>/<li> <table class="cs"> <tr> <th> <td> <span class="k">; Unicode maths).
// Check: node tools/check-cheat.mjs
export default [
  // ───────────────────────────── Week 1: Introduction ─────────────────────────────
  {
    id: 'w1-ml-types', week: 1, topic: 'w1-types', title: 'Types of ML by supervision', imp: 3, kind: 'facts',
    html: `<b>Supervised</b>: labelled → <span class="k">classification</span> (nominal target) or <span class="k">regression</span> (numeric).<br><b>Unsupervised</b>: unlabelled → clustering, anomaly/novelty detection, DR/visualisation, association rules.<br><b>Semi-supervised</b>: many unlabelled + few labelled (labels expensive).<br><b>Reinforcement</b>: agent acts → reward/penalty → updates policy (AlphaGo).`,
  },
  {
    id: 'w1-unsup-algos', week: 1, topic: 'w1-types', title: 'Unsupervised algorithms (W1)', imp: 2, kind: 'facts',
    html: `Clustering: k-means, DBSCAN, HCA. Anomaly: one-class SVM, Isolation Forest.<br>Visualisation/DR: PCA, kernel PCA, LLE, t-SNE (CIFAR-10 3072-D → 2-D).<br>Association rules: Apriori, Eclat.<br>DR: drop irrelevant/redundant or merge correlated features (age + mileage → wear and tear); cut too many → accuracy drops.`,
  },
  {
    id: 'w1-batch-online', week: 1, topic: 'w1-types', title: 'Batch/online, instance/model', imp: 2, kind: 'compare',
    html: `<b>Batch</b>: train offline on all data; new data → retrain from scratch on old + new.<br><b>Online</b>: learn in small chunks (1 example / mini-batch); adapts fast; data &gt; RAM → online.<br><b>Instance-based</b>: store examples, predict from the most similar (kNN).<br><b>Model-based</b>: explicit model, e.g. a line = decision boundary.`,
  },
  {
    id: 'w1-what-is-ml', week: 1, topic: 'w1-types', title: 'What is ML?', imp: 1, kind: 'facts',
    html: `Samuel 1959: learn without being explicitly programmed. Mitchell 1997: task T, experience E, measure P (spam: label emails, emails, accuracy).<br>Good for: long rule lists, no traditional fix, changing problems, insight from big data.<br>Ingredients: data, model, learning algorithm.`,
  },
  {
    id: 'w1-written-supunsup', week: 1, topic: 'w1-types', title: 'Written: supervised vs unsup.', imp: 3, kind: 'worked',
    html: `<b>Supervised</b>: data has a specified <i>target</i> to predict; types: <span class="k">classification</span> (nominal target, e.g. spam) and <span class="k">regression</span> (numeric, e.g. car price).<br><b>Unsupervised</b>: no specific target; types: <span class="k">clustering</span> (group similar items), <span class="k">outlier/anomaly/novelty detection</span> (unusual items), <span class="k">dimensionality reduction</span> (visualisation).`,
  },
  {
    id: 'w1-splits', week: 1, topic: 'w1-basics', title: 'Train / validation / test', imp: 3, kind: 'rule',
    html: `Only train/test (80/20) and pick the best of 100 models on test → too optimistic (5% test error, 15% on new data).<br>Better 60/20/20: <b>val</b> → choose model + hyperparameters; <b>test</b> → final error, once.<br>Even better: train + test split, cross-validation on train.<br>Generalisation = new data; training score is not enough.`,
  },
  {
    id: 'w1-data-problems', week: 1, topic: 'w1-basics', title: 'Data challenges', imp: 2, kind: 'facts',
    html: `Non-representative: small sample → <span class="k">sampling noise</span>; even large → <span class="k">sampling bias</span> (1936: 2.4M of 10M replied → Landon 57%; Roosevelt won 62%: wealthy + nonresponse bias).<br>Poor quality: errors, outliers (remove), noise; missing → drop or impute.<br>Irrelevant features → garbage in, garbage out; feature engineering: selection, extraction, more data.`,
  },
  {
    id: 'w1-fit-remedies', week: 1, topic: 'w1-basics', title: 'Overfit / underfit remedies', imp: 3, kind: 'rule',
    html: `<b>Overfit</b> = complex model on little data fits noise ("name contains w → happy" fails on Rwanda). Fix: more data; less noise (fix errors, drop outliers); simpler model (fewer parameters/attributes); constrain it = <span class="k">regularisation</span>.<br><b>Underfit</b>: model with more parameters; better features; fewer constraints (weaker regularisation).`,
  },
  {
    id: 'w1-qa-basics', week: 1, topic: 'w1-basics', title: 'Past Qs: ML basics', imp: 3, kind: 'qa',
    html: `Spam detection → supervised (labels)<br>Segment customers → clustering<br>Many unlabelled + few labelled → semi-sup.<br>Unsupervised → unlabelled data<br>Predict via similarity → nearest neighbour<br>Underfit → more complex model<br>Overfit → simpler model / more data`,
  },

  // ───────────────────────────── Week 2: kNN & trees ─────────────────────────────
  {
    id: 'w2-knn-algo', week: 2, topic: 'w2-knn', title: 'k-nearest neighbours', imp: 3, kind: 'facts',
    html: `Distance ‖xᵢ − x*‖₂ to all training points → k closest → regression: <b>average</b>; classification: <b>majority vote</b>.<br>Instance-based, "lazy"; multi-class natively; regression = step function.<br>k = 1 → jagged boundary, overfits; larger k → smoother; too large → underfits.<br>Distance-based → <b>scale features</b>; no native missing values.`,
  },
  {
    id: 'w2-knn-toy', week: 2, topic: 'w2-knn', title: 'kNN worked example', imp: 2, kind: 'worked',
    html: `Query (1,2); squared distances, sorted:<br>i6 (1,1) Red 1; i2 (2,1) Blue 2; i4 (−1,2) Blue 4; i1 (−1,3) Red 5; i5 (−1,0) Blue 8; i3 (−2,2) Red 9.<br>k = 1 → <b>Red</b>. k = 3 → R, B, B → <b>Blue</b>.<br>Recipe: all distances → sort → take k → vote / average.`,
  },
  {
    id: 'w2-normalise', week: 2, topic: 'w2-knn', title: 'Normalisation formulas', imp: 2, kind: 'formula',
    html: `Why: x₁ ∈ [0, 1], x₂ ∈ [0, 10⁶] → x₂ dominates every distance.<br><b>Min-max</b>: (x − min)/(max − min) → [0, 1].<br><b>Standardise</b>: (x − mean)/sd → mean 0, sd 1.<br>Missing values: drop example, drop feature, or impute (mean or smarter).`,
  },
  {
    id: 'w2-var-types', week: 2, topic: 'w2-knn', title: 'Feature types', imp: 1, kind: 'facts',
    html: `Continuous number → numerical. Discrete with natural order (0, 1, 2 children) → numerical.<br>Discrete without order (1 = Sweden, 2 = Denmark) → <b>categorical</b>; text string → categorical.<br>Feature = attribute-value pair (age = 21).`,
  },
  {
    id: 'w2-tree-basics', week: 2, topic: 'w2-trees', title: 'Decision tree basics', imp: 3, kind: 'facts',
    html: `Disjoint regions, constant prediction each = nested if-then-else rules.<br>Each split: 1 feature vs threshold → <span class="k">parallel to an axis</span>.<br><b>Regression tree</b>: leaf = <b>mean</b>; greedy split minimising SSE = Σ<sub>L</sub>(y − ȳ<sub>L</sub>)² + Σ<sub>R</sub>(y − ȳ<sub>R</sub>)².<br>Stop: max depth, too few examples, SSE ≈ 0.`,
  },
  {
    id: 'w2-impurity', week: 2, topic: 'w2-trees', title: 'Gini, entropy, misclass.', imp: 2, kind: 'formula',
    html: `2 classes, r = share of one class:<br>Misclassification: 1 − max(r, 1 − r)<br><span class="k">Gini</span>: 2r(1 − r); k classes: 1 − Σpₖ²<br><span class="k">Entropy</span>: −r ln r − (1 − r) ln(1 − r)<br>0 when pure; max at r = 0.5 (Gini 0.5).<br>Root [37, 34, 41] → Gini 0.665; leaf [37, 0, 0] → 0.<br>Child usually purer than parent, not always.`,
  },
  {
    id: 'w2-tree-props', week: 2, topic: 'w2-trees', title: 'Tree properties', imp: 3, kind: 'facts',
    html: `Fast; explainable (plot_tree); <b>no scaling</b> needed; some implementations (not sklearn) handle missing values; pruning.<br>Gives estimated <b>class probabilities</b> (class shares in the leaf).<br>Fully grown (leaf_size = 1) ≈ kNN k = 1 → overfits.<br><span class="k">Unstable</span>: small data change → very different tree (bad alone, good in ensembles).`,
  },
  {
    id: 'w2-tree-tuning', week: 2, topic: 'w2-trees', title: 'Tree depth rules', imp: 3, kind: 'rule',
    html: `Overfit → ↓max_depth, ↓max_leaf_nodes, ↑min samples per split/leaf.<br>Underfit → ↑max_depth, ↑max_leaf_nodes (↓depth makes it worse; scaling changes nothing).<br>Unrestricted depth ≈ log₂ m (m = 10⁶ → ≈ 20).<br>Training time ≈ linear in m (lecturer's answer: 10× data → 10× time).`,
  },
  {
    id: 'w2-qa-trees', week: 2, topic: 'w2-trees', title: 'Past Qs: kNN & trees', imp: 3, kind: 'qa',
    html: `kNN handles → &gt;2 classes<br>Tree splits → parallel to an axis<br>Tree class probabilities? → yes<br>Fast + no scaling + NaN (some impl.) → all<br>↓max_depth: overfit → yes; underfit → no<br>Underfit tree: scale inputs? → no effect<br>Child Gini vs parent → usually lower<br>Full depth, m = 10⁶ → ≈ 20 (log₂ m)<br>1 h @ 1M → 10M: ≈ 10 h (linear)`,
  },

  // ───────────────────────────── Week 3: linear models ─────────────────────────────
  {
    id: 'w3-normal-eq', week: 3, topic: 'w3-linear', title: 'Linear regression', imp: 2, kind: 'formula',
    html: `ŷ = θ₀ + θ₁x₁ + … + θₙxₙ = θᵀx; MSE = (1/m) Σ(θᵀxᵢ − yᵢ)².<br><span class="k">Normal equation</span>: θ = (XᵀX)⁻¹Xᵀy. y = 4 + 3x + noise → θ ≈ [4.215, 2.770]; x = 2 → 9.755.<br><code>LinearRegression</code> uses <b>SVD</b>: robust, works with more features than examples or redundant features; time linear in m, quadratic in n.`,
  },
  {
    id: 'w3-logistic', week: 3, topic: 'w3-linear', title: 'Logistic regression', imp: 2, kind: 'formula',
    html: `A <b>classifier</b> despite the name: p̂ = σ(θᵀx), <span class="k">sigmoid</span> σ(t) = 1/(1 + e<sup>−t</sup>) ∈ (0, 1); class 1 if p̂ ≥ 0.5.<br>Cost: −log p̂ if y = 1, −log(1 − p̂) if y = 0; J = −(1/m) Σ[y log p̂ + (1 − y) log(1 − p̂)].<br>No closed form → gradient descent.<br><code>LogisticRegression(C=…)</code>: high C = little regularisation.`,
  },
  {
    id: 'w3-softmax', week: 3, topic: 'w3-linear', title: 'Softmax regression', imp: 3, kind: 'formula',
    html: `Generalises the <b>sigmoid</b> to K classes = multinomial logistic regression.<br>p̂ₖ = exp(sₖ)/Σⱼ exp(sⱼ): all in [0, 1], sum 1; predict argmax.<br>Loss: <span class="k">cross-entropy</span> −(1/m)ΣᵢΣₖ yₖ log p̂ₖ<br><code>LogisticRegression(multi_class="multinomial", solver="lbfgs", C=10)</code><br>Non-exclusive (indoor/outdoor + day/night) → 2 logistic classifiers.`,
  },
  {
    id: 'w3-poly-curves', week: 3, topic: 'w3-linear', title: 'Polynomial features & curves', imp: 2, kind: 'rule',
    html: `Non-linear data → add powers: <code>PolynomialFeatures(degree=2, include_bias=False)</code> + plain linear regression.<br>y = 0.5x² + x + 2: degree 1 underfits, 2 fits, 300 overfits.<br><span class="k">Learning curves</span> (error vs training-set size): both high and close = underfit; low train + gap to val = overfit.`,
  },
  {
    id: 'w3-bias-var', week: 3, topic: 'w3-biasvar', title: 'Bias–variance trade-off', imp: 3, kind: 'facts',
    html: `Generalisation error = bias² + variance + irreducible error.<br><span class="k">Bias</span>: wrong assumptions (linear for quadratic) → <b>underfit</b>.<br><span class="k">Variance</span>: sensitive to small data changes → <b>overfit</b>.<br>Irreducible: noise (cleaning data helps)<br>High complexity → low bias, high variance; low complexity → high bias, low variance.`,
  },
  {
    id: 'w3-bullseye', week: 3, topic: 'w3-biasvar', title: "Bull's-eye picture", imp: 2, kind: 'table',
    html: `<table class="cs"><tr><th></th><th>low variance</th><th>high variance</th></tr><tr><td>low bias</td><td>tight on centre (ideal)</td><td>scattered around centre</td></tr><tr><td>high bias</td><td>tight, off-centre</td><td>scattered, off-centre</td></tr></table>Tight but off-centre = high bias, low variance → underfit.`,
  },
  {
    id: 'w3-fix-fit', week: 3, topic: 'w3-biasvar', title: 'Diagnose and fix fit', imp: 3, kind: 'rule',
    html: `<b>Underfit</b> (high bias): train ≈ val, both high → more complex model (↑degree), more/better features, ↓α (↑C).<br><b>Overfit</b> (high variance): train ≪ val → more data, simpler / more constrained model (↓degree, ↑α, ↓C).<br>Underfit curves plateau high: more data won't help.`,
  },
  {
    id: 'w3-reg-formulas', week: 3, topic: 'w3-reg', title: 'Ridge, Lasso, Elastic Net', imp: 2, kind: 'formula',
    html: `<b>Ridge</b> (L2): J = MSE + α·½Σθᵢ²; closed form (XᵀX + αA)⁻¹Xᵀy.<br><b>Lasso</b> (L1): J = MSE + αΣ|θᵢ| (no closed form → GD).<br><b>Elastic Net</b>: J = MSE + rαΣ|θᵢ| + ½(1 − r)αΣθᵢ²; r = <code>l1_ratio</code> (0 = Ridge, 1 = Lasso).<br>Sums from i = 1 (bias not penalised). α = 0 → LinReg; α → ∞ → flat line at the mean.`,
  },
  {
    id: 'w3-reg-when', week: 3, topic: 'w3-reg', title: 'When Ridge / Lasso / ENet', imp: 3, kind: 'rule',
    html: `<b>Ridge</b>: plain LinReg overfits; many examples, few well-behaved features; shrinks all weights.<br><b>Lasso</b>: many <i>irrelevant</i> features → sets their weights to 0 (implicit feature selection); 10⁶ features.<br><b>Elastic Net</b>: many features, highly <i>correlated</i> features (over Lasso: correlated).<br>All: <b>scale</b> features first.`,
  },
  {
    id: 'w3-reg-sklearn', week: 3, topic: 'w3-reg', title: 'Regularised models in sklearn', imp: 2, kind: 'code',
    html: `<code>Ridge(alpha=1, solver="cholesky")</code> (closed form)<br><code>SGDRegressor(penalty="l2")</code>: lower-case L2, not 12<br><code>Lasso(alpha=0.1)</code> or <code>SGDRegressor(penalty="l1")</code><br><code>ElasticNet(alpha=0.1, l1_ratio=0.5)</code><br>Underfit → ↓alpha; overfit → ↑alpha.`,
  },
  {
    id: 'w3-qa-regression', week: 3, topic: 'w3-reg', title: 'Past Qs: regression', imp: 3, kind: 'qa',
    html: `10⁶ features, 1000 examples → Lasso<br>Features ≫ examples, correlated → ENet<br>Many examples, few good features → Ridge<br>ENet over Lasso → correlated features<br>Lasso over Ridge → many irrelevant feats<br>Ridge over LinReg → LinReg overfits<br>Ridge: train ≈ val, both high → ↓α<br>Poly: train ≪ val → overfit, ↓degree<br>Softmax generalises → sigmoid`,
  },

  // ───────────────────────────── Week 4: performance ─────────────────────────────
  {
    id: 'w4-kfold', week: 4, topic: 'w4-cv', title: 'k-fold cross-validation', imp: 3, kind: 'facts',
    html: `Alternative to one train/val split: split the <b>training</b> data into k equal folds (default 10); train on k − 1, validate on the held-out fold; repeat k times → k scores → <b>mean ± std</b>.<br><span class="k">Stratified</span>: each fold keeps the overall class distribution.<br>Repeat with other seeds → lower variance. Cost: k× runtime.`,
  },
  {
    id: 'w4-written-cv', week: 4, topic: 'w4-cv', title: 'Written: explain k-fold CV', imp: 3, kind: 'worked',
    html: `1) k equal folds; train on k − 1, evaluate on the held-out one; repeat for each fold → k scores.<br>2) Mean ± std → more precise than 1 split; each example validated once.<br>3) Cost: k× runtime. Stratified: folds keep class ratios.<br>4) k = 10: 90% train ≈ 100%; 10× time<br>5) Use: estimate error, choose models.`,
  },
  {
    id: 'w4-cv-sklearn', week: 4, topic: 'w4-cv', title: 'CV in sklearn', imp: 2, kind: 'code',
    html: `<code>cross_val_score(clf, X, y, cv=3, scoring="accuracy")</code> → k scores ([.953, .951, .963]).<br><code>cross_val_predict(clf, X, y, cv=3)</code> → clean out-of-fold prediction per example (→ confusion matrix).<br><code>StratifiedKFold(n_splits=3)</code> for manual loops.`,
  },
  {
    id: 'w4-gap', week: 4, topic: 'w4-cv', title: 'Generalisation gap', imp: 2, kind: 'facts',
    html: `Complexity ↑ → training error ↓; test error U-shaped.<br><span class="k">Generalisation gap</span> = test error − training error.<br>Val (hold-out) error ≈ test error if same distribution.<br>Test set = final check only; tuning on it → optimistic.`,
  },
  {
    id: 'w4-confusion', week: 4, topic: 'w4-metrics', title: 'Precision, recall, F1, Fβ', imp: 3, kind: 'formula',
    html: `sklearn [[TN, FP], [FN, TP]]: rows actual, cols predicted.<br><span class="k">Precision</span> = TP/(TP + FP): predicted 5s that are 5s.<br><span class="k">Recall</span> = TPR = TP/(TP + FN): 5s found<br><span class="k">F1</span> = 2/(1/P + 1/R) = TP/(TP + (FN + FP)/2): <b>harmonic</b> mean.<br>F<sub>β</sub> = (1 + β²)PR/(β²P + R); β = how much more recall matters.`,
  },
  {
    id: 'w4-pr-worked', week: 4, topic: 'w4-metrics', title: 'P/R from a confusion matrix', imp: 3, kind: 'worked',
    html: `[[5, 1], [2, 3]] → TN 5, FP 1, FN 2, TP 3.<br>P = 3/4 = 0.75; R = 3/5 = 0.60; F1 = 3/(3 + 1.5) = 0.667; accuracy 8/11.<br>MNIST: [[52992, 1587], [1074, 4347]] → P .733, R .802, F1 .766.<br>Trap: 600 of 800 positives found + 600 negatives flagged → recall 0.75 (0.5 is precision).`,
  },
  {
    id: 'w4-threshold', week: 4, topic: 'w4-metrics', title: 'Threshold trade-off', imp: 3, kind: 'rule',
    html: `Scores from <code>decision_function</code> (default threshold 0).<br>Threshold ↑ → precision ↑ (usually), recall ↓: 6/8 &amp; 6/6 → 4/5 &amp; 4/6 → 3/3 &amp; 3/6.<br>Read off <code>precision_recall_curve</code>: recall at precision 0.9 = 0.599.<br>Missing positives costly → favour recall (lower threshold, β &gt; 1).`,
  },
  {
    id: 'w4-roc', week: 4, topic: 'w4-metrics', title: 'ROC and AUC', imp: 3, kind: 'facts',
    html: `ROC: TPR vs FPR = FP/(FP + TN) over all thresholds; best corner (0, 1); diagonal = random.<br><span class="k">AUC</span>: 1.0 best, 0.5 random; no threshold needed; very popular; slide: works well for imbalanced data.<br>Build from <b>scores</b> (y_score), not y_pred → else a one-corner curve.`,
  },
  {
    id: 'w4-multiclass', week: 4, topic: 'w4-metrics', title: 'Multiclass vs multilabel', imp: 2, kind: 'facts',
    html: `<b>Multiclass</b> from binary models: OvR (1 per class, highest score; SGD does it automatically) or OvO (1 per pair: N(N − 1)/2 → 45 for 10 digits).<br><b>Multilabel</b>: &gt;1 binary target per example (large, odd).<br><b>Multioutput</b>: several multiclass targets (denoise: 1 per pixel).`,
  },
  {
    id: 'w4-averages', week: 4, topic: 'w4-metrics', title: 'Macro, weighted, micro', imp: 1, kind: 'facts',
    html: `<code>classification_report</code>: per-class P, R, F1, support.<br><b>Macro</b> avg = simple mean over classes/labels; <b>weighted</b> = by support (#samples).<br>Slide "micro" = per example, then average (sklearn calls that "samples"; its micro pools all counts).`,
  },
  {
    id: 'w4-qa-evaluation', week: 4, topic: 'w4-cv', title: 'Past Qs: evaluation', imp: 3, kind: 'qa',
    html: `Validation set → tune hyperparameters<br>Tune/select on test set → fool ourselves<br>… if offered, pick "all of the above"<br>k-fold CV splits the → training data<br>F1 → harmonic mean of P and R<br>Tight but off-centre → high bias, low var<br>In/outdoor + day/night → 2 LogRegs`,
  },

  // ───────────────────────────── Week 5: data prep & GD ─────────────────────────────
  {
    id: 'w5-missing', week: 5, topic: 'w5-prep', title: 'Missing values', imp: 2, kind: 'compare',
    html: `Drop rows <code>df.dropna()</code>: big data, few missing.<br>Drop the feature: simplest option.<br><b>Impute</b> <code>df.fillna(df.median())</code> / <code>SimpleImputer</code>: usually better; <b>median</b> for numeric, <b>most common</b> for categorical.<br>Model-based imputation: most sophisticated, needs its own validation; gain may not be worth it.`,
  },
  {
    id: 'w5-encoding', week: 5, topic: 'w5-prep', title: 'Label vs one-hot encoding', imp: 3, kind: 'compare',
    html: `Drop the feature: lazy (OK if mostly unique values).<br><span class="k">Label</span> (<code>cat.codes</code>, <code>OrdinalEncoder</code>): integer per category, alphabetical (Auckland 0, Dunedin 1) → fake order, misleading.<br><span class="k">One-hot</span> (<code>pd.get_dummies</code>, <code>OneHotEncoder</code>): 0/1 column per category → <b>best</b>.<br>Too many → group rare ("others") or recode (lat/long).`,
  },
  {
    id: 'w5-scalers', week: 5, topic: 'w5-prep', title: 'MinMax vs Standard scaler', imp: 3, kind: 'compare',
    html: `<code>MinMaxScaler</code> → [0, 1]; slide: for <b>skewed</b> data.<br><code>StandardScaler</code> → mean 0, sd 1; for <b>normal-looking</b> data.<br><code>sc.fit_transform(X_train)</code>, then <code>sc.transform(X_test)</code>: fit on train only.<br>Needs scaling: GD/SGD (worst), SVM, kNN, Ridge/Lasso, NNs. Trees don't.`,
  },
  {
    id: 'w5-losses', week: 5, topic: 'w5-gd', title: 'Losses and two ways to learn', imp: 1, kind: 'facts',
    html: `Learning = find parameters minimising training loss.<br>Regression: squared, absolute, Huber, ε-insensitive.<br>Classification: logistic, exponential, hinge, squared hinge, misclassification.<br>Closed form (normal equation) or <b>gradient descent</b>: no closed form (Lasso), matrix not invertible, or too expensive.`,
  },
  {
    id: 'w5-gd-basics', week: 5, topic: 'w5-gd', title: 'Gradient descent and η', imp: 3, kind: 'rule',
    html: `θ ← θ − η∇J; batch gradient (MSE) = (2/m)Xᵀ(Xθ − y).<br><span class="k">Learning rate η</span> too small → slow; too big → jumps across, diverges (0.02 slow, 0.1 good, 0.5 diverges).<br>Non-convex loss: local minima, plateaus.<br>Unscaled features → elongated bowl → slow → StandardScaler.`,
  },
  {
    id: 'w5-gd-variants', week: 5, topic: 'w5-gd', title: 'Batch vs SGD vs mini-batch', imp: 3, kind: 'compare',
    html: `<b>Batch</b>: all m per step → smooth, exact optimum; slow if m big.<br><b>SGD</b>: 1 random example → fast, bounces near min; out-of-core; shrink η to settle.<br><b>Mini-batch</b>: small batches → in between; GPU-friendly.<br>Constant η: only batch reaches the exact optimum; SGD gets close fastest.`,
  },
  {
    id: 'w5-solver-table', week: 5, topic: 'w5-gd', title: 'Linear regression solvers', imp: 2, kind: 'table',
    html: `<table class="cs"><tr><th></th><th>large m / n</th><th>out-core, scale</th></tr><tr><td>Normal eq/SVD</td><td>fast / slow</td><td>no, no</td></tr><tr><td>Batch GD</td><td>slow / fast</td><td>no, yes</td></tr><tr><td>SGD, mini</td><td>fast / fast</td><td>yes, yes</td></tr></table>Hyperparams 0 / 2 / ≥2. SVD = <code>LinearRegression</code>; GD = <code>SGDRegressor</code>.`,
  },
  {
    id: 'w5-momentum-grid', week: 5, topic: 'w5-gd', title: 'Momentum & grid search', imp: 2, kind: 'facts',
    html: `<span class="k">Momentum</span>: accumulate past gradients → escape local minima, cross plateaus, faster.<br><span class="k">Grid search</span>: test every combination of hyperparameter values; <code>GridSearchCV(sgd_clf, grid_dict)</code> adds cross-validation.`,
  },
  {
    id: 'w5-qa-prep-gd', week: 5, topic: 'w5-gd', title: 'Past Qs: data prep & GD', imp: 3, kind: 'qa',
    html: `Hurt most by feature scales → SGDRegressor<br>Very different scales → StandardScaler<br>Categorical → OneHotEncoder (OrdinalEnc.)<br>Missing → SimpleImputer / drop feature<br>Constant η, exact optimum → batch GD<br>Constant η, close fastest → SGD<br>Batch GD: stop when val err ↑ → always<br>Mini-batch: stop at first val ↑ → no<br>O(mn): 2× m, 2× n → 4× time (1 → 4 min)`,
  },

  // ───────────────────────────── Week 6: neural networks ─────────────────────────────
  {
    id: 'w6-history', week: 6, topic: 'w6-mlp', title: 'Perceptron, XOR, activations', imp: 2, kind: 'facts',
    html: `3 waves: 1960s linear only; 1980s XOR + backprop but slow, little data; <b>2010s</b>: GPUs, large labelled datasets, new ideas.<br><span class="k">Perceptron</span>: step(wᵀx); linear → can't learn <b>XOR</b>; an MLP can.<br>Non-linear activations needed (stacked linear layers stay linear): step, sigmoid, tanh, <b>ReLU</b>.`,
  },
  {
    id: 'w6-output-loss', week: 6, topic: 'w6-mlp', title: 'Output layer and loss by task', imp: 3, kind: 'table',
    html: `<table class="cs"><tr><th>Task</th><th>Output</th><th>Loss</th></tr><tr><td>regression</td><td>1/dim, none</td><td>MSE</td></tr><tr><td>binary</td><td>1 sigmoid</td><td>binary CE</td></tr><tr><td>multilabel</td><td>sigmoid/label</td><td>binary CE</td></tr><tr><td>multiclass</td><td>softmax/class</td><td>categ. CE</td></tr></table>Int labels → <code>"sparse_categorical_crossentropy"</code>; one-hot → <code>"categorical_crossentropy"</code>; MAE/Huber if outliers.`,
  },
  {
    id: 'w6-keras', week: 6, topic: 'w6-mlp', title: 'Keras: define, compile, fit', imp: 3, kind: 'code',
    html: `<code>Sequential([Flatten(input_shape=[28,28]), Dense(300, activation="relu"), …, Dense(10, activation="softmax")])</code><br><code>compile(loss="sparse_categorical_crossentropy", optimizer="sgd", metrics=["accuracy"])</code><br><code>fit(X, y, epochs=30, validation_data=(X_val, y_val))</code><br>evaluate(X, y); predict → class probs`,
  },
  {
    id: 'w6-dense-params', week: 6, topic: 'w6-mlp', title: 'Dense layer #params', imp: 3, kind: 'formula',
    html: `Dense params = inputs × units + units (biases).<br>Flatten 28×28 = 784 → Dense 300: 235,500; → 100: 30,100; → 10: 1,010; Flatten 0 → total 266,610.<br><code>model.summary()</code>: layers, output shapes, #params.<br>Flatten needed: Dense expects 1-D input.`,
  },
  {
    id: 'w6-keras-more', week: 6, topic: 'w6-mlp', title: 'Functional API & backprop', imp: 2, kind: 'facts',
    html: `Non-sequential (DAG, wide &amp; deep) → still Keras <b>functional API</b>: explicit <code>Input</code>, thread layers via variables, <code>Concatenate</code>, <code>keras.Model(inputs=…, outputs=…)</code>.<br><span class="k">Backprop</span>: forward pass stores values; backward pass, chain rule → adjust all weights a bit; random init.`,
  },
  {
    id: 'w6-mlp-hparams', week: 6, topic: 'w6-mlp', title: 'Layers, units, hyperparameters', imp: 2, kind: 'rule',
    html: `Layers: start 1–2; one wide layer could fit any smooth function but may need millions of units → many smaller layers.<br>Units: 100s, powers of 2, same per layer; stretch pants: too big + early stopping<br><b>LR most important</b> (start large, ÷3 if it diverges); batch 32; ReLU inside; early stopping.`,
  },
  {
    id: 'w6-qa-nn-basics', week: 6, topic: 'w6-mlp', title: 'Past Qs: NN basics & Keras', imp: 3, kind: 'qa',
    html: `Regression: <code>compile(loss="mean_squared_error", optimizer="sgd")</code><br>Train: <code>fit(X, y, epochs=30, validation_data=(Xv, yv))</code><br>Layers + #params → model.summary()<br>DAG-shaped net → can still use Keras<br>k classes → k units + categorical CE<br>Training → backprop; common loss → MSE<br>Non-linear activations → learn XOR etc.`,
  },
  {
    id: 'w6-dnn-problems', week: 6, topic: 'w6-dnn', title: 'Deep net problems → fixes', imp: 2, kind: 'facts',
    html: `<span class="k">Vanishing gradients</span> (sigmoid saturates; zero gradient stops learning; opposite: exploding) → ReLU, <b>batch norm</b> = trainable, incremental StandardScaler inside the net.<br>Little labelled data → transfer learning, pretraining.<br>Slow training → Adam, LR schedules, GPUs.<br>Overfitting → dropout, L1/L2, early stopping.`,
  },
  {
    id: 'w6-optimisers', week: 6, topic: 'w6-dnn', title: 'Optimisers & LR schedules', imp: 2, kind: 'facts',
    html: `Momentum → Nesterov (smarter) · AdaGrad (adaptive per-dimension LR) → RMSProp (smarter AdaGrad) · <span class="k">Adam</span> = RMSProp + momentum (try first) · Nadam = Adam + Nesterov.<br>Schedules: power r, r/2, r/3…; exponential r, 0.1r, 0.01r…; piecewise constant; performance (↓LR when val error stalls). Best: performance &amp; exponential; <code>LearningRateScheduler</code>.`,
  },
  {
    id: 'w6-regularise', week: 6, topic: 'w6-dnn', title: 'Dropout & regularisation', imp: 3, kind: 'facts',
    html: `<span class="k">Dropout</span>: in training, ignore random units per mini-batch (off at prediction): <code>Dropout(rate=0.2)</code> → regularisation.<br><code>kernel_regularizer=keras.regularizers.l2(0.01)</code>; also l1(), l1_l2().<br><span class="k">Early stopping</span>: stop when val error stalls → simple, effective regulariser.<br>2020s defaults: scale inputs, ReLU, BatchNorm/LayerNorm, Adam/AdamW.`,
  },
  {
    id: 'w6-transfer', week: 6, topic: 'w6-dnn', title: 'Transfer learning', imp: 3, kind: 'rule',
    html: `Use when a model trained on <b>lots of data for a similar task</b> exists → reuse its lower layers.<br>Keras: copy model, new top, <b>freeze</b> reused layers (<code>trainable = False</code>), train; unfreeze, train on with low LR (big early errors would wreck good weights).<br>Nothing similar → unsupervised or self-supervised pretraining (auxiliary task).`,
  },
  {
    id: 'w6-qa-deep', week: 6, topic: 'w6-dnn', title: 'Past Qs: training deep nets', imp: 3, kind: 'qa',
    html: `Most important hyperparameter → LR<br>Most popular activation → ReLU<br>DropOut, early stopping → regularisation<br>ADAM → (non-linear) optimiser<br>Transfer → good big model, similar task<br>Out of GPU memory → smaller mini-batch<br>Images: CNN beats dense (same #weights)<br>2010s boom → data + GPUs (+ algorithms)<br>2025 key: Python+data+algos (likely slip)`,
  },
  {
    id: 'w6-conv', week: 6, topic: 'w6-cnn', title: 'Convolution basics', imp: 3, kind: 'facts',
    html: `Conv = weighted sum over each pixel's neighbourhood; <b>linear</b>; spans all channels; filters learned.<br>Border: zero-pad (same size) or no pad (smaller). Stride &gt; 1 → smaller output.<br>Early layers: low-level features; later: combinations → high-level; no feature engineering.<br>CNN: images (spatial); RNN: sequences.`,
  },
  {
    id: 'w6-conv-size', week: 6, topic: 'w6-cnn', title: 'Conv output size & pooling', imp: 3, kind: 'formula',
    html: `Output = ⌊(n + 2p − f)/s⌋ + 1 (n input, f filter, p padding, s stride).<br>3×3, f 2, p 0, s 1 → 2×2. 28×28, f 3, p 1, s 1 → 28×28.<br><span class="k">Max pooling</span>: max of each window; non-linear; no weights; shrinks; invariant to small shifts.`,
  },
  {
    id: 'w6-conv-worked', week: 6, topic: 'w6-cnn', title: 'Worked conv + max-pool', imp: 3, kind: 'worked',
    html: `[[1,3,6],[1,5,9],[1,7,11]] * [[1,−1],[0,1]], s 1, no pad (no kernel flip):<br>3 = 1−3+0+5; 6 = 3−6+0+9; 3 = 1−5+0+7; 7 = 5−9+0+11 → <b>[[3,6],[3,7]]</b>.<br>2×2 max-pool, s 1: 5, 9, 7, 11 → <b>[[5,9],[7,11]]</b> (max of each window).<br>2019: [[2,4,8],[2,6,12],[2,8,16]] * [[−1,0],[0,1]] → [[4,8],[6,10]]; pool [[6,12],[8,16]]`,
  },
  {
    id: 'w6-cnn-arch', week: 6, topic: 'w6-cnn', title: 'CNN design & GPU memory', imp: 2, kind: 'facts',
    html: `Conv + pooling first, then Dense; convs 3×3 (first layer maybe larger, stride &gt; 1). LeNet-5 (MNIST); AlexNet (ImageNet 2012).<br>Backprop stores all intermediate maps → GPU RAM. Out of memory: ↓batch size; higher strides / fewer layers; 16- or 8-bit; more GPUs.<br><span class="k">Data augmentation</span>: slightly corrupt copies (shift, rotate, flip, crop).`,
  },

  // ───────────────────────────── Week 7: ensembles ─────────────────────────────
  {
    id: 'w7-ens-why', week: 7, topic: 'w7-voting', title: 'Why ensembles work', imp: 3, kind: 'facts',
    html: `Combine ≥ 2 models; reduces variance and/or bias. Types: bagging, boosting, stacking.<br>Members as <b>good</b> as possible and as <b>independent</b> as possible (conundrum: perfect ones would be identical).<br><span class="k">Weak learner</span>: better than chance → ensemble can be strong.<br>1000 × 51% → ~75%, only if independent.`,
  },
  {
    id: 'w7-diversity', week: 7, topic: 'w7-voting', title: 'Where diversity comes from', imp: 2, kind: 'facts',
    html: `Different algorithms on the same data (LR, SVM, RF → voting / stacking).<br>Other data subsets: bagging, pasting<br>Other feature subsets: random subspaces/patches; RF per split.<br>Random thresholds: Extra-Trees<br>Reweighting / residuals: boosting<br>Unstable learners (trees) gain most.`,
  },
  {
    id: 'w7-hard-soft', week: 7, topic: 'w7-voting', title: 'Hard vs soft voting', imp: 3, kind: 'compare',
    html: `<span class="k">Hard</span>: majority of predicted labels (1, 1, 2, 1 → 1).<br><span class="k">Soft</span>: average class probabilities → highest; needs <code>predict_proba</code>; confident votes count more.<br><code>VotingClassifier(estimators=[('lr', lr), ('rf', rf), ('svc', svc)], voting='hard')</code>; <code>voting='soft'</code> (SVC: <code>probability=True</code>).<br>LR .864, RF .896, SVC .888 → vote .904`,
  },
  {
    id: 'w7-vote-worked', week: 7, topic: 'w7-voting', title: 'Voting arithmetic', imp: 3, kind: 'worked',
    html: `FAQ3: M1 (.95, .05), M2 (.45, .55), M3 (.40, .60).<br>Hard: votes 1, 2, 2 → <b>class 2</b>.<br>Soft: sums 1.8 vs 1.2 → ÷3 → (.6, .4) → <b>class 1</b>.<br>FAQ2: 3 independent 60% models, majority right: .6³ + 3·.6²·.4 = .216 + .432 = <b>.648</b>.<br>Hard vote ignores confidence: Dog .9, Cat .45, Cat .35, Iguana .6, Penguin .4 → Cat.`,
  },
  {
    id: 'w7-qa-ensembles', week: 7, topic: 'w7-voting', title: 'Past Qs: ensembles', imp: 3, kind: 'qa',
    html: `Soft voting → sum class probs, normalise<br>OOB benefit → replaces a validation set<br>Extra-Trees → random split threshold<br>Nominal-only: RF vs Extra-Trees → same speed<br>AdaBoost underfits → bigger ensemble<br>Inherently sequential → gradient boosting<br>OOB ≈ a free ___ set → validation`,
  },
  {
    id: 'w7-bag-paste', week: 7, topic: 'w7-bagging', title: 'Bagging vs pasting', imp: 3, kind: 'compare',
    html: `<span class="k">Bagging</span> = sample <b>with</b> replacement (bootstrap aggregating); any size, default m.<br><span class="k">Pasting</span> = <b>without</b> replacement; bags must be smaller than m.<br>Bagging more popular; small data → bag, huge → paste (disjoint chunks).<br>≈ same bias, lower variance → smoother than 1 tree. Pasting ≠ CV (CV: stratified, exhaustive).`,
  },
  {
    id: 'w7-bag-sklearn', week: 7, topic: 'w7-bagging', title: 'BaggingClassifier API', imp: 3, kind: 'code',
    html: `<code>BaggingClassifier(DecisionTreeClassifier(), n_estimators=500, max_samples=100, bootstrap=True, n_jobs=-1)</code><br><code>bootstrap=False</code> → pasting; <code>n_jobs=-1</code> → all cores; soft vote if predict_proba.<br><code>oob_score=True</code> → <code>oob_score_</code> (.901 vs test .912); <code>oob_decision_function_</code><br><code>max_features</code> / <code>bootstrap_features</code> → sample features`,
  },
  {
    id: 'w7-oob', week: 7, topic: 'w7-bagging', title: 'Out-of-bag evaluation', imp: 3, kind: 'formula',
    html: `P(example not in a bootstrap bag) = (1 − 1/m)<sup>m</sup> ≈ e<sup>−1</sup> ≈ <b>37%</b>; a bag holds ≈ 63% unique examples (slide's 67% / 330 of 1000 is a slip: ≈ 632 in, 368 out).<br>FAQ4: 100 draws from 100 → 36 missing, 37 once, 20 twice.<br>Score each example with only the members that never saw it → accuracy/F1 ≈ <b>validation set for free</b>.`,
  },
  {
    id: 'w7-patches', week: 7, topic: 'w7-bagging', title: 'Random subspaces vs patches', imp: 3, kind: 'compare',
    html: `Sample <b>features</b> too (<code>max_features</code>) → more diverse members.<br><span class="k">Random subspaces</span>: features only, all examples (not bagging) → few examples, many features.<br><span class="k">Random patches</span>: examples + features → many examples, many features.<br>Feature sampling with replacement (usually) makes no sense.`,
  },
  {
    id: 'w7-written-eval', week: 7, topic: 'w7-bagging', title: 'Written: val vs CV vs OOB', imp: 3, kind: 'worked',
    html: `<b>Val set</b>: 1 run → fastest; 1 split → noisy, less training data; any learner.<br><b>k-fold CV</b>: k runs → k× time; most reliable (mean ± std, all data validated); best for small data; any learner.<br><b>OOB</b>: ~free (no extra runs; members that never saw an example score it); all data trains; only bagging ensembles (bootstrap=True, RF).`,
  },
  {
    id: 'w7-rf-core', week: 7, topic: 'w7-rf', title: 'Random forest', imp: 3, kind: 'facts',
    html: `= bagging of trees + <b>feature randomisation inside the tree</b>: at <b>every split</b>, pick a random feature subset, use the best split in it.<br>Defaults work well with enough trees (100s–1000s) → perfect off-the-shelf learner.<br><code>RandomForestClassifier(n_estimators=500, max_leaf_nodes=16, n_jobs=-1)</code>; also …Regressor.`,
  },
  {
    id: 'w7-rf-vs-et', week: 7, topic: 'w7-rf', title: 'Random forest vs Extra-Trees', imp: 3, kind: 'compare',
    html: `<table class="cs"><tr><th></th><th>RF</th><th>Extra-Trees</th></tr><tr><td>features</td><td>random subset</td><td>random subset</td></tr><tr><td>threshold</td><td>best one</td><td><b>random</b></td></tr><tr><td>training</td><td>slower</td><td>much faster</td></tr><tr><td>#trees</td><td>100s</td><td>many more</td></tr></table>Either may win → compare by CV. Same API: <code>ExtraTreesClassifier</code>.`,
  },
  {
    id: 'w7-importance', week: 7, topic: 'w7-rf', title: 'RF feature importance', imp: 2, kind: 'facts',
    html: `How much a feature improves Gini purity on average (weighted), scaled to sum 1: <code>feature_importances_</code>.<br>Iris: petal length .44, petal width .42, sepal length .11, sepal width .02.<br>MNIST: centre pixels important, borders useless.`,
  },
  {
    id: 'w7-rf-params', week: 7, topic: 'w7-rf', title: 'RF options', imp: 2, kind: 'code',
    html: `Options = tree options (<code>max_depth</code>, <code>max_leaf_nodes</code>, <code>min_samples_leaf</code>, <code>max_features</code>) + bagging options (<code>n_estimators</code>, <code>bootstrap</code>, <code>oob_score</code>, <code>n_jobs</code>).<br>Slide: RF ≈ <code>BaggingClassifier(DecisionTreeClassifier(splitter="random", max_leaf_nodes=16), n_estimators=500, max_samples=1.0, bootstrap=True)</code>`,
  },
  {
    id: 'w7-which-ensemble', week: 7, topic: 'w7-rf', title: 'Which ensemble when?', imp: 2, kind: 'rule',
    html: `Off-the-shelf → RF (100s+ trees)<br>Faster / more random → Extra-Trees<br>Huge data → pasting; few examples + many features → subspaces.<br>Different good models → voting or stacking<br>Fix predecessors' errors step by step → boosting`,
  },
  {
    id: 'w7-boost-vs', week: 7, topic: 'w7-boost', title: 'AdaBoost vs gradient boosting', imp: 3, kind: 'compare',
    html: `<table class="cs"><tr><th></th><th>AdaBoost</th><th>Gradient B.</th></tr><tr><td>next model</td><td>reweights</td><td>fits residuals</td></tr><tr><td>say</td><td>α (accuracy)</td><td>equal × LR</td></tr><tr><td>predict</td><td>weighted vote</td><td>sum of trees</td></tr></table>Both sequential, built from weak learners (stumps / shallow trees); too many members → overfit.`,
  },
  {
    id: 'w7-ada-formulas', week: 7, topic: 'w7-boost', title: 'AdaBoost formulas', imp: 3, kind: 'formula',
    html: `r<sub>j</sub> = Σ<sub>wrong</sub> w / Σ w: weighted error<br>α<sub>j</sub> = η · ln((1 − r<sub>j</sub>)/r<sub>j</sub>) (r = 0.5 → 0; r → 0 → ∞)<br>Wrong: w ← w · e<sup>α<sub>j</sub></sup>; correct: unchanged; then normalise.<br>Predict: ŷ = argmax<sub>k</sub> Σ α<sub>j</sub> over predictors voting k.<br>Base learner must be imperfect (r = 0 → α = ∞) and better than chance.`,
  },
  {
    id: 'w7-ada-worked', week: 7, topic: 'w7-boost', title: 'AdaBoost round (worked)', imp: 2, kind: 'worked',
    html: `10 examples, w = 0.1; 3 misclassified.<br>r₁ = 0.3 → α₁ = ln(0.7/0.3) = 0.847 (η = 1).<br>Wrong: 0.1 · e<sup>0.847</sup> = 0.1 · 2.333 = 0.233; correct stay 0.1.<br>Sum 0.7 + 0.7 = 1.4 → normalise: 0.0714 (right), 0.1667 (wrong).<br>Round 2: r₂ = 0.476 → α₂ = 0.096 (tiny say). Round 3: r₃ = 0.204 → α₃ ≈ 1.36.`,
  },
  {
    id: 'w7-ada-sklearn', week: 7, topic: 'w7-boost', title: 'AdaBoostClassifier', imp: 2, kind: 'code',
    html: `<code>AdaBoostClassifier(DecisionTreeClassifier(max_depth=1), n_estimators=200, algorithm="SAMME.R", learning_rate=0.5)</code><br>max_depth = 1 tree = <span class="k">decision stump</span>. SAMME = multi-class AdaBoost; .R uses probabilities.<br>Any base classifier works (slide: RBF SVM on moons); learning_rate 0.5 → smaller weight steps than 1.`,
  },
  {
    id: 'w7-gb', week: 7, topic: 'w7-boost', title: 'Gradient boosting', imp: 3, kind: 'facts',
    html: `Don't reweight: fit each new tree to the <span class="k">residuals</span> of the ensemble so far.<br>tree1.fit(X, y); y2 = y − tree1.predict(X); tree2.fit(X, y2); y3 = y2 − tree2.predict(X); …<br>ŷ = sum of all trees' predictions.<br><span class="k">learning_rate</span> shrinks each tree: more trees ↔ lower LR (1.0 with 3 trees vs 0.1 with 200); #trees by early stopping.`,
  },
  {
    id: 'w7-gb-worked', week: 7, topic: 'w7-boost', title: 'Gradient boosting by hand', imp: 2, kind: 'worked',
    html: `Target y = 10. Tree 1 predicts 7 → residual 3.<br>Tree 2 fits the residual, predicts 2 → residual 1.<br>Tree 3 predicts 0.8 → ŷ = 7 + 2 + 0.8 = 9.8.<br>learning_rate 0.1: each tree adds only 0.1 × its prediction → needs many more trees.`,
  },
  {
    id: 'w7-gb-early', week: 7, topic: 'w7-boost', title: 'staged_predict, warm_start', imp: 3, kind: 'code',
    html: `<code>errors = [mse(y_val, p) for p in gbrt.staged_predict(X_val)]</code>: predictions after 1, 2, 3… trees; best n = argmin + 1 (0-based); retrain with it (slide: 55 of 120).<br><code>warm_start=True</code>: fit() keeps old trees → grow 1 by 1, stop after 5 rounds in a row without a new best.<br>XGBoost/LightGBM/CatBoost: GPU; <code>eval_set=[(X_val, y_val)], early_stopping_rounds=2</code>.`,
  },
  {
    id: 'w7-bag-vs-boost', week: 7, topic: 'w7-boost', title: 'Bagging vs boosting', imp: 3, kind: 'compare',
    html: `<table class="cs"><tr><th></th><th>Bagging/RF</th><th>Boosting</th></tr><tr><td>training</td><td>parallel</td><td><b>sequential</b></td></tr><tr><td>data</td><td>bootstrap</td><td>reweight / residual</td></tr><tr><td>combine</td><td>vote / mean</td><td>weighted, sum</td></tr><tr><td>mainly ↓</td><td>variance</td><td>bias</td></tr></table>Also parallel: voting, pasting, Extra-Trees, patches. Boosting overfits more easily → early stopping.`,
  },
  {
    id: 'w7-troubleshoot', week: 7, topic: 'w7-boost', title: 'Ensemble problem → fix', imp: 2, kind: 'rule',
    html: `AdaBoost overfits → fewer estimators, ↓learning_rate, simpler base learner.<br>AdaBoost underfits → more estimators.<br>GB overfits → early stopping (fewer trees), ↓learning_rate.<br>RF / bagging overfits → smaller trees (max_depth, max_leaf_nodes).`,
  },
  {
    id: 'w7-handy-numbers', week: 7, topic: 'w7-boost', title: 'Handy numbers (no calculator)', imp: 3, kind: 'table',
    html: `<table class="cs"><tr><td>e<sup>−0.1</sup>=.905</td><td>e<sup>0.1</sup>=1.105</td><td>ln 2=.693</td></tr><tr><td>e<sup>−0.25</sup>=.779</td><td>e<sup>0.25</sup>=1.284</td><td>ln 3=1.099</td></tr><tr><td>e<sup>−0.5</sup>=.607</td><td>e<sup>0.5</sup>=1.649</td><td>ln 1.1=.095</td></tr><tr><td>e<sup>−1</sup>=.368</td><td>e<sup>1</sup>=2.718</td><td>ln(7/3)=.847</td></tr><tr><td>e<sup>−1.5</sup>=.223</td><td>√2=1.414</td><td>log₂10⁶≈20</td></tr><tr><td>e<sup>−2</sup>=.135</td><td>√3=1.732</td><td>σ(0)=.5</td></tr><tr><td>e<sup>−3</sup>=.050</td><td>√8=2.828</td><td>σ(2)=.881</td></tr><tr><td>tanh 1=.762</td><td>√64=8</td><td>σ(−2)=.119</td></tr></table>1/e = .368 → OOB ≈ 37%; √d<sub>k</sub>: √4 = 2`,
  },
  {
    id: 'w7-stacking', week: 7, topic: 'w7-stack', title: 'Stacking', imp: 3, kind: 'facts',
    html: `Replace voting by a learner: <span class="k">blender</span> / meta-learner maps base predictions (3.1, 2.7, 2.9) → 3.0.<br>Train: split training set in 2; subset 1 trains base models; they predict subset 2 → blending training set → train blender (predictions on unseen data).<br>3 layers → 3 subsets.`,
  },
  {
    id: 'w7-stack-code', week: 7, topic: 'w7-stack', title: 'StackingClassifier', imp: 2, kind: 'code',
    html: `<code>StackingClassifier(estimators=[('rf', RandomForestClassifier(n_estimators=10)), ('svr', make_pipeline(StandardScaler(), LinearSVC()))], final_estimator=LogisticRegression())</code><br><code>final_estimator</code> = blender (sklearn trains it on cross-validated predictions).<br>Older slide: "not built in" (it is now).`,
  },

  // ───────────────────────────── Week 8: SVMs ─────────────────────────────
  {
    id: 'w8-svm-idea', week: 8, topic: 'w8-margin', title: 'SVM: widest street', imp: 3, kind: 'facts',
    html: `Large-margin classifier = <b>widest street</b> between classes; boundary = middle line.<br><span class="k">Support vectors</span>: on the street edges (soft margin: also inside); they alone fix the boundary (extra points off the street, on their side, change nothing).<br>Linear + non-linear classification, regression, outlier detection; best for complex small–medium data (1000s–10000s).`,
  },
  {
    id: 'w8-hard-soft', week: 8, topic: 'w8-margin', title: 'Hard vs soft margin; C', imp: 3, kind: 'compare',
    html: `<span class="k">Hard margin</span>: no instance inside the street; only if linearly separable; one outlier → tiny margin.<br>Soft margin: allow violations, cost <b>C</b>:<br>Low C → wide street, more violations → smoother; fixes overfitting.<br>High C → narrow street, fewer training errors; fixes underfitting.<br>Plot: C = 1 wide vs C = 100 narrow.`,
  },
  {
    id: 'w8-linearsvc', week: 8, topic: 'w8-margin', title: 'Scaling & LinearSVC', imp: 3, kind: 'rule',
    html: `<b>Scale</b> first: unscaled → narrow street; scaled → wider margin.<br><code>Pipeline([("scaler", StandardScaler()), ("linear_svc", LinearSVC(C=1, loss="hinge"))])</code><br>Hints: scale; <code>loss="hinge"</code>; <code>dual=False</code> unless more features than examples.<br>Predicts classes + decision_function score (confidence); <b>no probabilities</b>.`,
  },
  {
    id: 'w8-svm-vs-logreg', week: 8, topic: 'w8-margin', title: 'SVM vs logistic regression', imp: 2, kind: 'compare',
    html: `Both linear classifiers with C (high C = weak regularisation).<br><b>LogReg</b>: log loss; every example counts; outputs probabilities.<br><b>Linear SVM</b>: hinge loss; only support vectors matter; class + score, no probabilities; scaling needed for the margin.<br>Non-linear: SVM kernel trick vs LogReg + polynomial features.`,
  },
  {
    id: 'w8-svm-draw', week: 8, topic: 'w8-margin', title: 'Drawing a hard-margin SVM', imp: 3, kind: 'worked',
    html: `1) Closest opposite-class pair → candidate <b>support vectors</b> (circle each).<br>2) 1 SV each side → boundary = <b>perpendicular bisector</b> of their segment.<br>3) 2 SVs on one side → boundary ∥ their line, halfway to the other SV.<br>4) Margins: 2 dashed lines ∥ boundary through the SVs; street must be empty (a point inside → it is an SV too: use 3).`,
  },
  {
    id: 'w8-qa-svm', week: 8, topic: 'w8-margin', title: 'Past Qs: SVM', imp: 3, kind: 'qa',
    html: `RBF underfit → ↑γ (key); also ↑C (slides)<br>10⁶ instances, 100s features → primal<br>Confidence score? → yes; probability: no<br>Why scale → larger margin / wider street<br>Hard-margin SV → exactly on the margin<br>(2019 mock key: "on the decision boundary"; slides: street edge)<br>Core idea → widest street / best hyperplane`,
  },
  {
    id: 'w8-poly-kernel', week: 8, topic: 'w8-kernel', title: 'Polynomial features vs kernel', imp: 2, kind: 'facts',
    html: `1-D not separable → add x₂ = x₁² → separable.<br>Explicit: <code>PolynomialFeatures(degree=3)</code> + <code>StandardScaler</code> + <code>LinearSVC(C=10, loss="hinge")</code>: many features at high degree → slow.<br><span class="k">Kernel trick</span>: same result, no new features: <code>SVC(kernel="poly", degree=3, coef0=1, C=5)</code>; coef0 = r: high- vs low-degree influence.`,
  },
  {
    id: 'w8-rbf', week: 8, topic: 'w8-kernel', title: 'RBF similarity features', imp: 3, kind: 'formula',
    html: `φ<sub>γ</sub>(x, ℓ) = exp(−γ‖x − ℓ‖²): bell curve; 1 at landmark ℓ, → 0 far away; γ sets the width (↑γ = narrower).<br>1-D, landmarks −2 and +1 (γ = 0.3): x = −1 → (e<sup>−0.3</sup>, e<sup>−1.2</sup>) = (0.74, 0.30) → separable.<br>All m training points as landmarks → m features. <code>SVC(kernel="rbf", gamma=5, C=0.001)</code> does it implicitly.`,
  },
  {
    id: 'w8-gamma-c', week: 8, topic: 'w8-kernel', title: 'RBF SVM: γ and C', imp: 3, kind: 'rule',
    html: `Small γ → wide bell, far reach → smooth boundary. Large γ → narrow bell, local → wiggly.<br>Small C → violations cheap → smooth. Large C → costly → wiggly.<br><span class="k">Underfit → ↑γ and/or ↑C</span>. <span class="k">Overfit → ↓γ and/or ↓C</span>.<br>γ, C act like regularisation knobs (2019 mock key: underfit → "increase gamma").`,
  },
  {
    id: 'w8-kernels', week: 8, topic: 'w8-kernel', title: 'Kernel functions', imp: 3, kind: 'formula',
    html: `K(a, b) = φ(a)ᵀφ(b), computed without φ:<br>Linear: aᵀb<br>Polynomial: (γaᵀb + r)<sup>d</sup><br>Gaussian RBF: exp(−γ‖a − b‖²)<br>Sigmoid: tanh(γaᵀb + r)<br>SVC: <code>kernel="linear" | "poly" (degree, coef0) | "rbf" (gamma) | "sigmoid"</code>`,
  },
  {
    id: 'w8-kernel-trick', week: 8, topic: 'w8-kernel', title: 'Kernel trick explained', imp: 3, kind: 'facts',
    html: `In the dual, examples appear only as dot products x<sup>(i)</sup>ᵀx<sup>(j)</sup> → plug in K(x<sup>(i)</sup>, x<sup>(j)</sup>).<br>Same as training on φ(x) without ever computing φ: no explicit features, cheap even if φ is huge.<br>φ(x) = (x₁², √2·x₁x₂, x₂²) ⇒ φ(a)ᵀφ(b) = (aᵀb)²: 2nd-degree polynomial kernel.`,
  },
  {
    id: 'w8-which-kernel', week: 8, topic: 'w8-kernel', title: 'Which kernel?', imp: 3, kind: 'rule',
    html: `1) Start with <code>LinearSVC</code>: faster than <code>SVC(kernel="linear")</code>, scales to large data.<br>2) Then RBF: <code>SVC(kernel="rbf")</code>.<br>3) More time / need better: CV + grid search (γ, C); try <code>"poly"</code> or special kernels (string kernels: text, DNA).`,
  },
  {
    id: 'w8-kernel-calc', week: 8, topic: 'w8-kernel', title: 'Kernel values (worked)', imp: 2, kind: 'worked',
    html: `a = (1, 2), b = (2, 0): aᵀb = 2; ‖a − b‖² = 1 + 4 = 5.<br>Linear 2. Poly (γ 1, r 1, d 2): (2 + 1)² = 9.<br>RBF γ 0.1: e<sup>−0.5</sup> = .607; γ 1: e<sup>−5</sup> ≈ .007 (big γ → similarity dies fast).<br>Check φ(a)ᵀφ(b) = (aᵀb)² = 4 with φ = (x₁², √2x₁x₂, x₂²): 1·4 + 0 + 0 = 4.`,
  },
  {
    id: 'w8-svr', week: 8, topic: 'w8-svr', title: 'SVM regression (SVR)', imp: 3, kind: 'facts',
    html: `Opposite goal: fit as many instances as possible <b>inside</b> the street (within ±ε of the line), limiting those outside.<br><span class="k">ε-insensitive</span>: adding instances inside the tube doesn't change the model.<br><code>LinearSVR(epsilon=1.5)</code>; kernels: <code>SVR(kernel="poly", degree=2, C=100, epsilon=0.1)</code>.`,
  },
  {
    id: 'w8-svr-params', week: 8, topic: 'w8-svr', title: 'SVR: ε and C', imp: 2, kind: 'rule',
    html: `<b>ε</b> = half-width of the tube: ε 1.5 → wide tube, few support vectors (points on/outside); ε 0.5 → narrow tube, many.<br><b>C</b>: high (100) → follows the data, little regularisation; low (0.01) → flatter, more regularised.`,
  },
  {
    id: 'w8-decision', week: 8, topic: 'w8-svr', title: 'Decision function & objective', imp: 2, kind: 'formula',
    html: `h(x) = wᵀx + b; ŷ = 1 if h ≥ 0 else 0; street edges at h = ±1.<br>Smaller ‖w‖ → wider street (w₁ = 0.5 → 2× wider than w₁ = 1).<br>Hard: min ½wᵀw s.t. t<sup>(i)</sup>(wᵀx<sup>(i)</sup> + b) ≥ 1, t = ±1.<br>Soft: min ½wᵀw + CΣζ<sup>(i)</sup> s.t. t<sup>(i)</sup>(wᵀx<sup>(i)</sup> + b) ≥ 1 − ζ<sup>(i)</sup>, ζ ≥ 0 (slack = violation).`,
  },
  {
    id: 'w8-dual', week: 8, topic: 'w8-svr', title: 'Primal vs dual', imp: 3, kind: 'compare',
    html: `<b>Dual</b>: same problem via dot products of instances; α<sup>(i)</sup> ≥ 0 per instance: &gt; 0 for support vectors, 0 otherwise.<br>ŵ = Σα<sup>(i)</sup>t<sup>(i)</sup>x<sup>(i)</sup> (only SVs); b̂ = mean over SVs of t<sup>(i)</sup> − ŵᵀx<sup>(i)</sup>.<br>Kernel trick needs the <b>dual</b>.<br>Millions of instances, 100s of features → <b>primal</b>; more features than instances → dual.`,
  },
  {
    id: 'w8-complexity', week: 8, topic: 'w8-svr', title: 'SVM classes: complexity', imp: 3, kind: 'table',
    html: `<table class="cs"><tr><th>Class</th><th>Time</th><th>out-of-core / kernel</th></tr><tr><td>LinearSVC</td><td>O(m × n)</td><td>no / no</td></tr><tr><td>SGDClassifier</td><td>O(m × n)</td><td>yes / no</td></tr><tr><td>SVC</td><td>O(m²n) to O(m³n)</td><td>no / yes</td></tr></table>All need scaling; SVC too slow for large m (100,000s).`,
  },
  {
    id: 'w8-hinge', week: 8, topic: 'w8-svr', title: 'Online SVM & hinge loss', imp: 3, kind: 'formula',
    html: `<code>SGDClassifier(loss="hinge")</code> = linear SVM by SGD (online, out-of-core).<br>J(w, b) = ½wᵀw + C Σ max(0, 1 − t<sup>(i)</sup>(wᵀx<sup>(i)</sup> + b))<br><span class="k">Hinge</span> max(0, 1 − t): 0 if t ≥ 1 (right side, off the street); rises linearly for t &lt; 1.`,
  },
  {
    id: 'w8-margin-calc', week: 8, topic: 'w8-svr', title: 'Margin & hinge numbers', imp: 2, kind: 'worked',
    html: `Street edges at wᵀx + b = ±1 → width 2/‖w‖: w = (3, 4) → ‖w‖ = 5 → width 0.4; halve ‖w‖ → double width.<br>t·h(x) ≥ 1: correct, off the street (hinge 0); 0 ≤ t·h &lt; 1: inside the street (violation); t·h &lt; 0: misclassified.<br>Hinge: t·h = 2 → 0; 0.5 → 0.5; −1 → 2.`,
  },

  // ───────────────────────────── Week 9: Bayesian regression & GPs ─────────────────────────────
  {
    id: 'w9-blr-idea', week: 9, topic: 'w9-blr', title: 'Bayesian linear regression', imp: 3, kind: 'facts',
    html: `Not one best line: a <b>distribution over the weights</b> (intercept w₀, slope w₁) → many plausible lines → prediction = mean ± uncertainty.<br>Each thin line in the plot = one plausible model, not more data.<br>One number hides uncertainty: "≈ 21 °C, confident" vs "anywhere 17–25".`,
  },
  {
    id: 'w9-bayes-rule', week: 9, topic: 'w9-blr', title: "Bayes' rule terms", imp: 3, kind: 'formula',
    html: `p(w | D) = p(D | w) p(w) / p(D)<br><span class="k">Prior</span> p(w): plausibility of each slope before the reading.<br><span class="k">Likelihood</span> p(D | w): how well the reading fits that slope's prediction.<br><span class="k">Posterior</span> p(w | D): plausibility after the reading.<br>p(D) normalises → posteriors sum to 1. Posterior ∝ likelihood × prior.`,
  },
  {
    id: 'w9-noise', week: 9, topic: 'w9-blr', title: 'Gaussian noise & likelihood', imp: 2, kind: 'formula',
    html: `y = f(x) + ε, ε ~ N(0, σ²) (slide σ = 1 °C): small errors common, big rare.<br>p(ε) = exp(−ε²/(2σ²)) / (√(2π)σ); relative score exp(−ε²/2).<br>Miss 0 → 1; ±2 → e<sup>−2</sup> = 0.135; 4 → e<sup>−8</sup> ≈ 0.0003 (tail: implausible).<br>±1σ ≈ 68%; <b>±2σ ≈ 95%</b>.`,
  },
  {
    id: 'w9-uncertainty', week: 9, topic: 'w9-blr', title: 'Two sources of uncertainty', imp: 2, kind: 'facts',
    html: `<b>Parameter</b> uncertainty: few data → many plausible lines; shrinks as data grows.<br><b>Noise</b> ε ~ N(0, σ²): measurement/count variation; stays however much data (GP: WhiteKernel).<br>Predictive std combines both: small near observations, large far away (extrapolation).`,
  },
  {
    id: 'w9-posterior-worked', week: 9, topic: 'w9-blr', title: 'Posterior over 3 slopes', imp: 3, kind: 'worked',
    html: `y = 18 + w·x; 20 °C at x = 2 (slide text: x = 0, typo); prior ⅓; σ = 1.<br>w = 0 → 18, miss 2 → e<sup>−2</sup> = 0.135; w = 1 → 20, miss 0 → 1; w = 2 → 22, miss −2 → 0.135.<br>Equal priors cancel → ÷ (0.135 + 1 + 0.135 = 1.27) → <b>10.7%, 78.7%, 10.7%</b>.<br>Recipe: predict → miss → exp(−miss²/(2σ²)) → × prior → ÷ sum.`,
  },
  {
    id: 'w9-posterior-variants', week: 9, topic: 'w9-blr', title: 'Posterior: prior & data shifts', imp: 2, kind: 'worked',
    html: `Same 3 slopes, reading 20 at x = 2, prior (¼, ½, ¼): 0.25·0.135 = 0.034, 0.5·1 = 0.5 → sum 0.568 → <b>6%, 88%, 6%</b>.<br>Reading 21, uniform prior: misses 3, 1, −1 → e<sup>−4.5</sup> = .011, e<sup>−0.5</sup> = .607, .607 → <b>1%, 49.5%, 49.5%</b>.<br>Uniform prior → posterior ∝ likelihood.`,
  },
  {
    id: 'w9-thermo', week: 9, topic: 'w9-blr', title: 'Thermometer example data', imp: 1, kind: 'worked',
    html: `08:00 18 °C (x 0); 09:00 19.3; 10:00 20; 12:00 ?; 14:00 22; 16:00 20 (x = hours after 08:00).<br>Midpoint (20 + 22)/2 = 21 assumes steady change. Line 18 + 1·x → 22 at x = 4.<br>Squared misses at 09:00, 10:00 (start 18): slope 0.5 → 1.64; 1 → 0.09 (best); 1.5 → 1.04.<br>Posterior mean line (plot): 18 + 0.8x.`,
  },
  {
    id: 'w9-blr-sklearn', week: 9, topic: 'w9-blr', title: 'BayesianRidge', imp: 3, kind: 'code',
    html: `<code>br = BayesianRidge(); br.fit(x, y)</code><br><code>y_pred, y_std = br.predict(x_test, return_std=True)</code><br>Plot y_pred ± 2·y_std = ~95% predictive band.<br>Continuous slopes: posterior = continuous distribution over w (not 3 values); Bayesian version of Ridge.`,
  },
  {
    id: 'w9-gp-idea', week: 9, topic: 'w9-gp', title: 'Gaussian process idea', imp: 3, kind: 'facts',
    html: `Few problems are linear and hand-made features don't scale → GP = <b>distribution over functions</b> f(x); each sample = a whole rule (temperature → fish).<br>y = f(x) + ε. Prior (e.g. mean 16, variance 25, RBF length 5) → data → plausible functions near the points.<br>Gives mean + std anywhere: fish at 17 °C from 10 °C: 12, 15 °C: 22, 20 °C: 16.`,
  },
  {
    id: 'w9-gp-sklearn', week: 9, topic: 'w9-gp', title: 'GaussianProcessRegressor', imp: 3, kind: 'code',
    html: `<code>reg = GaussianProcessRegressor(kernel=kernel); reg.fit(X, y)</code><br><code>y_pred, y_std = reg.predict(X_test, return_std=True)</code> → 95% band y_pred ± 2·y_std.<br><code>GaussianProcessClassifier(kernel=…)</code> → <code>predict_proba</code>.<br><code>reg.kernel_</code> → tuned kernel, e.g. RBF(length_scale=1.42)`,
  },
  {
    id: 'w9-gp-kernels', week: 9, topic: 'w9-gp', title: 'GP kernel by data shape', imp: 3, kind: 'rule',
    html: `Smooth → <code>RBF</code> (variants: Matern, RationalQuadratic)<br>Noisy → + <code>WhiteKernel</code> (≈ SVR ε)<br>Linear → <code>DotProduct</code> (≈ Bayesian LR)<br>Periodic → <code>ExpSineSquared</code><br>Polynomial → Exponentiation(DotProduct + Constant, d)<br>Offset → <code>ConstantKernel</code> (alone = the mean)`,
  },
  {
    id: 'w9-gp-combine', week: 9, topic: 'w9-gp', title: 'Combining & fixing kernels', imp: 2, kind: 'code',
    html: `Sum: <code>RBF() + WhiteKernel()</code> (smooth + noise). <code>Product(RBF(), ExpSineSquared())</code> = locally periodic.<br>Defaults: RBF l = 1; Matern ν = 1.5 (∞ → RBF); RationalQuadratic α = 1 (∞ → RBF); ExpSineSquared l = 1, period 1.<br><code>WhiteKernel(noise_level=1, noise_level_bounds=(0.1, 10))</code>: GP tunes within bounds; <code>"fixed"</code> → no tuning.`,
  },
  {
    id: 'w9-length-gamma', week: 9, topic: 'w9-gp', title: 'GP length scale vs SVM γ', imp: 3, kind: 'compare',
    html: `SVM RBF: exp(−γ‖a − b‖²): γ in the <b>numerator</b>.<br>GP RBF: exp(−‖a − b‖²/(2l²)): l in the <b>denominator</b> → opposite effect.<br><b>Large l</b> = small γ = smoother. <b>Small l</b> = large γ = more wiggly.<br>GP tunes l during fit (unless "fixed"); SVM γ you set (grid search).`,
  },
  {
    id: 'w9-blr-vs-gp', week: 9, topic: 'w9-gp', title: 'Bayesian LR vs GP', imp: 2, kind: 'compare',
    html: `BLR: distribution over <b>weights</b> → lines; <code>BayesianRidge</code>.<br>GP: distribution over <b>functions</b>; kernel sets the shape (smooth, periodic, linear…); <code>DotProduct</code> kernel ≈ BLR.<br>Both: <code>predict(…, return_std=True)</code> → mean ± 2 std ≈ 95% interval.<br>Picking a kernel needs domain knowledge (Conway's data-science Venn).`,
  },

  // ───────────────────────────── Week 10: dimensionality reduction & clustering ─────────────────────────────
  {
    id: 'w10-why-dr', week: 10, topic: 'w10-pca', title: 'Why reduce dimensions', imp: 3, kind: 'facts',
    html: `Speed (esp. methods worse than linear in #features: Ridge O(n²) memory, O(n³) time); sometimes accuracy (useless or correlated features: MNIST borders); <b>visualisation</b> (2-D/3-D; report, debug).<br>Always loses <i>some</i> information → may hurt accuracy.<br>Reversible only for some methods, approximately.`,
  },
  {
    id: 'w10-curse', week: 10, topic: 'w10-pca', title: 'Curse of dimensionality', imp: 2, kind: 'facts',
    html: `High-dim space is <b>sparse</b>: unit square 0.4% of points within 0.001 of a border; 10,000-D: 99.999999%.<br>Mean distance of 2 random points: 2-D 0.52, 3-D 0.66, 10⁶-D 408.25 → new points far from training data → overfitting very likely.<br>Fix by more data? 100-D needs more examples than atoms in the universe.`,
  },
  {
    id: 'w10-proj-manifold', week: 10, topic: 'w10-pca', title: 'Projection vs manifold', imp: 2, kind: 'compare',
    html: `<b>Projection</b>: data lies near a lower-dim subspace (3-D points near a plane) → project onto it (z₁, z₂). PCA = linear projection.<br><b>Manifold learning</b>: data on a curled-up low-dim shape (swiss roll) → projecting squashes layers together; unroll instead (LLE, t-SNE, UMAP).`,
  },
  {
    id: 'w10-pca-core', week: 10, topic: 'w10-pca', title: 'PCA', imp: 3, kind: 'facts',
    html: `Axes (principal components) with <b>maximum variance</b>, all mutually ⊥: c₁ = most variance, c₂ next…; n PCs for n-D data.<br>Project on first d PCs → keep most variance.<br>sklearn uses SVD; <code>PCA(n_components=2).fit_transform(X)</code>.<br>Helps NB, LogReg, single trees (want uncorrelated features); denoises.`,
  },
  {
    id: 'w10-pca-choose', week: 10, topic: 'w10-pca', title: 'Choosing #components', imp: 3, kind: 'worked',
    html: `<code>explained_variance_ratio_</code> → variance share per PC: [0.842, 0.146] → 2 PCs keep 98.8%.<br><code>d = np.argmax(np.cumsum(pca.explained_variance_ratio_) &gt;= 0.95) + 1</code><br>Or <code>PCA(n_components=0.95)</code>, or the elbow of the cumulative curve.<br>Ratios .50, .25, .12, .08, .05 → cumsum .50, .75, .87, .95 → <b>d = 4</b>.`,
  },
  {
    id: 'w10-pca-api', week: 10, topic: 'w10-pca', title: 'PCA: inverse, randomized, incr.', imp: 3, kind: 'code',
    html: `Lossy compression: <code>X_rec = pca.inverse_transform(pca.fit_transform(X))</code> → approximate (blurry digits; PCA(154)).<br><span class="k">Randomized</span>: <code>PCA(n_components=154, svd_solver="randomized")</code>: approx., O(m·d² + d³) vs full O(m·n² + n³) → much faster if d ≪ n; "auto" switches for big data.<br><span class="k">IncrementalPCA</span>: data &gt; RAM → <code>partial_fit</code> per mini-batch, or <code>np.memmap</code>.`,
  },
  {
    id: 'w10-pca-vs', week: 10, topic: 'w10-pca', title: 'PCA vs t-SNE / UMAP', imp: 3, kind: 'compare',
    html: `<b>PCA</b>: linear; keeps global variance; fast; transform + inverse_transform; fails on curled manifolds (swiss roll).<br><b>t-SNE, UMAP</b>: non-linear; keep local neighbourhoods → best class separation in 2-D plots (digits); mainly visualisation (t-SNE can't transform new data).`,
  },
  {
    id: 'w10-pca-fashion', week: 10, topic: 'w10-pca', title: 'PCA + LogReg (FashionMNIST)', imp: 1, kind: 'facts',
    html: `Accuracy rises fast with #PCs, then plateaus ~84%; runtime seconds → ~20 min at 180 PCs.<br>PC 1 ≈ 30% of variance, then quick drop-off; last 50 PCs: accuracy gains tiny, sometimes briefly worse (noise, overfitting).`,
  },
  {
    id: 'w10-unsup-tasks', week: 10, topic: 'w10-kmeans', title: 'Unsupervised tasks & uses', imp: 2, kind: 'facts',
    html: `Tasks: <span class="k">clustering</span>; <span class="k">anomaly detection</span> (learn normal → flag defects, fraud); <span class="k">density estimation</span> (distribution; visualisation).<br>Clustering uses: customer segmentation, data analysis, DR (affinity to k clusters = k features), anomalies (far from centres), semi-supervised, search engines, image segmentation.`,
  },
  {
    id: 'w10-kmeans-algo', week: 10, topic: 'w10-kmeans', title: 'k-means algorithm', imp: 3, kind: 'facts',
    html: `Init k centres; repeat: <b>assign</b> points to nearest centre; centre = <b>mean</b> of its points; until stable.<br>Converges, maybe to a <b>local</b> optimum → several runs.<br>Avg O(m·n·k) ≈ linear in m; <b>worst case exponential</b>.<br>Soft: <code>transform()</code> = distance to each centre (DR).`,
  },
  {
    id: 'w10-kmeans-worked', week: 10, topic: 'w10-kmeans', title: 'k-means by hand', imp: 2, kind: 'worked',
    html: `1-D points 1, 2, 3, 8, 9; k = 2; start centres 1 and 9.<br>Assign: 1, 2, 3 → c₁ (3: |3 − 1| = 2 &lt; 6); 8, 9 → c₂.<br>Update: c₁ = 2, c₂ = 8.5; reassign → no change → done.<br>Inertia = 1 + 0 + 1 + 0.25 + 0.25 = 2.5 (sum of squared distances).`,
  },
  {
    id: 'w10-kmeans-sklearn', week: 10, topic: 'w10-kmeans', title: 'KMeans API', imp: 3, kind: 'code',
    html: `<code>km = KMeans(n_clusters=5); y = km.fit_predict(X)</code> (= <code>km.labels_</code>); <code>km.cluster_centers_</code>; <code>km.predict(X_new)</code>.<br><code>km.inertia_</code>: squared distances to centres (slide: mean; sklearn: sum); <code>km.score(X)</code> = −inertia.<br><code>n_init</code> runs, keeps lowest inertia; <code>KMeans(5, init=good_init, n_init=1)</code>; default <code>init="k-means++"</code> (<code>"random"</code> to override).`,
  },
  {
    id: 'w10-kmeans-init', week: 10, topic: 'w10-kmeans', title: 'k-means++, Elkan, mini-batch', imp: 3, kind: 'facts',
    html: `<span class="k">k-means++</span> = smarter <b>initialisation</b>: 1st centre = random data point; next k − 1 random, proportional to distance from chosen centres (spread out); sklearn default.<br><span class="k">Elkan</span>: triangle inequality skips many distance computations.<br><span class="k">Mini-batch k-means</span>: update after each mini-batch → much faster, slightly worse inertia.`,
  },
  {
    id: 'w10-choose-k', week: 10, topic: 'w10-kmeans', title: 'Choosing k: elbow, silhouette', imp: 3, kind: 'rule',
    html: `Inertia always ↓ as k ↑ → don't minimise it; look for the <b>elbow</b> (slide: k = 4).<br><span class="k">Silhouette</span> s = (b − a)/max(a, b); a = mean distance within own cluster, b = mean distance to next-closest cluster; −1 … +1 (+1 well inside, 0 border, −1 wrong cluster).<br><code>silhouette_score(X, km.labels_)</code> = mean s → best k: 4 (≈ 0.69; k = 5 0.655).`,
  },
  {
    id: 'w10-silhouette-worked', week: 10, topic: 'w10-kmeans', title: 'Silhouette worked', imp: 2, kind: 'worked',
    html: `Point in A: mean distance to A's points a = 2; to nearest other cluster b = 6 → s = (6 − 2)/6 = 0.67 (good).<br>a = 5, b = 4 → s = (4 − 5)/5 = −0.2 → likely in the wrong cluster.<br>Diagram: one "knife" per cluster, dashed line = mean score.`,
  },
  {
    id: 'w10-kmeans-limits', week: 10, topic: 'w10-kmeans', title: 'k-means limits & uses', imp: 2, kind: 'facts',
    html: `Need k; best for <b>spherical</b>, similar-size clusters; mislabels elongated / different-size blobs. <b>Scale</b> inputs (+ maybe PCA).<br>Image segmentation: pixel = RGB point → replace by its centre (smaller k → fewer colours).<br>Preprocessing: Pipeline(KMeans(50), LogReg) on digits: error 3.33% → 1.77%; grid search → 90 clusters.`,
  },
  {
    id: 'w10-ssl', week: 10, topic: 'w10-kmeans', title: 'Clustering for semi-supervision', imp: 2, kind: 'facts',
    html: `50 labels: random → 82.7%; 50 <b>representative</b> images (closest to 50 centroids) → 92.4%.<br>Propagate labels to whole cluster → 92.9% (outliers mislabelled); only 20% closest → 94.2%.<br><span class="k">Active learning</span>: label the most uncertain (p ≈ 0.51), retrain, repeat until all &gt; 0.8.`,
  },
  {
    id: 'w10-qa-clust-dr', week: 10, topic: 'w10-kmeans', title: 'Past Qs: clustering & DR', imp: 3, kind: 'qa',
    html: `Segment customers → clustering / DBSCAN<br>Why DR → visualisation<br>DR reversible? → some methods, approx.<br>DR → usually loses some information<br>PCA on swiss roll → no (linear only)<br>DBSCAN vs k-means → finds #clusters itself<br>k-means++ → smarter initialisation<br>k-means always → ≥ local optimum<br>k-means in m: worst exp., average linear`,
  },
  {
    id: 'w10-dbscan-core', week: 10, topic: 'w10-dbscan', title: 'DBSCAN', imp: 3, kind: 'facts',
    html: `Clusters = continuous high-density regions, any shape. Params <code>eps</code> (ε radius), <code>min_samples</code>; #clusters automatic.<br><span class="k">Core</span>: ≥ min_samples within ε (incl. self)<br><span class="k">Border</span>: not core, but within ε of a core.<br><span class="k">Outlier</span>/noise: the rest (label −1).<br>Core points within ε of each other chain into one cluster with all their neighbours.`,
  },
  {
    id: 'w10-dbscan-worked', week: 10, topic: 'w10-dbscan', title: 'DBSCAN labelling recipe', imp: 3, kind: 'worked',
    html: `Count within ε <b>incl. itself</b> → <b>core</b>: ≥ min_samples → <b>border</b>: non-core within ε of a core → rest <b>outlier</b>.<br>2019: pair L1–L2; lone I; A–B, B–C, B–D, C–D within ε → counts L 2, 2; I 1; A 2, B 4, C 3, D 3.<br>min 2: all core except I (outlier). min 3: B, C, D core; A border; L1, L2, I outliers.`,
  },
  {
    id: 'w10-dbscan-sklearn', week: 10, topic: 'w10-dbscan', title: 'DBSCAN API', imp: 3, kind: 'code',
    html: `<code>db = DBSCAN(eps=0.05, min_samples=5).fit(X)</code><br><code>db.labels_</code> (−1 = outlier), <code>core_sample_indices_</code>, <code>components_</code> (core points).<br><b>No predict()</b>, only <code>fit_predict</code> → train <code>KNeighborsClassifier(50)</code> on the cores and their labels; set −1 if the nearest core is &gt; 0.2 away.`,
  },
  {
    id: 'w10-dbscan-params', week: 10, topic: 'w10-dbscan', title: 'DBSCAN: eps & min_samples', imp: 3, kind: 'rule',
    html: `eps too small → clusters break into pieces + many outliers (moons, eps 0.05: 7 clusters, yet 808 of 1000 core).<br>Larger eps → clusters grow and merge (eps 0.2 → the 2 moons); too large → one big cluster.<br>↑min_samples → fewer cores → more outliers; ↓ → more cores, clusters merge.`,
  },
  {
    id: 'w10-km-vs-db', week: 10, topic: 'w10-dbscan', title: 'k-means vs DBSCAN', imp: 3, kind: 'compare',
    html: `<table class="cs"><tr><th></th><th>k-means</th><th>DBSCAN</th></tr><tr><td>#clusters</td><td>you set k</td><td>automatic</td></tr><tr><td>shapes</td><td>spherical</td><td>any (density)</td></tr><tr><td>outliers</td><td>none (all assigned)</td><td>label −1</td></tr><tr><td>params</td><td>k, init, n_init</td><td>eps, min_samples</td></tr><tr><td>new data</td><td>predict()</td><td>no predict</td></tr></table>`,
  },
  {
    id: 'w10-other-clust', week: 10, topic: 'w10-dbscan', title: 'Other clustering algorithms', imp: 2, kind: 'facts',
    html: `<b>Agglomerative</b>: bottom-up merging.<br><b>BIRCH</b>: tree index; can beat k-means (time, memory) if &lt; 20 attrs<br><b>Mean-shift</b>: circles → local means; radius; O(m²)<br><b>Affinity propagation</b>: voting variant<br><b>Spectral</b>: factorise similarity; O(m²)<br><b>Gaussian mixture</b> models (textbook)`,
  },
  {
    id: 'w10-anomaly', week: 10, topic: 'w10-dbscan', title: 'Anomaly detectors', imp: 2, kind: 'facts',
    html: `<b>Fast-MCD</b>: elliptic envelope around the clean part.<br><b>Isolation Forest</b>: random trees; outliers isolated near the root.<br><b>LOF</b>: density much lower than its neighbours' → outlier.<br><b>One-class SVM</b>: separate data from the origin; good in high-dim, slow on large data.`,
  },

  // ───────────────────────────── Week 11: NLP, attention, transformers ─────────────────────────────
  {
    id: 'w11-terms', week: 11, topic: 'w11-embed', title: 'NLP terms', imp: 2, kind: 'facts',
    html: `<b>Corpus</b>: body of text. <b>Token</b>: character sequence: part of a word, a word or several words (often called "word"). <b>Tokenisation</b>: corpus → tokens. <b>Vocabulary</b>/dictionary: all possible tokens.<br>Learned representations: hand features cumbersome; want generalisation across syntactic, semantic, topical, sentiment relations.`,
  },
  {
    id: 'w11-encodings', week: 11, topic: 'w11-embed', title: 'One-hot / n-gram / embedding', imp: 3, kind: 'compare',
    html: `<table class="cs"><tr><th></th><th>size</th><th>relations</th></tr><tr><td>one-hot</td><td>vocab size, one 1</td><td>none</td></tr><tr><td>n-gram counts</td><td>kⁿ, large, sparse</td><td>limited</td></tr><tr><td>embedding</td><td>100s, dense, learned</td><td>captured well</td></tr></table>Dims meaningless alone; depends on corpus + algorithm.`,
  },
  {
    id: 'w11-embed-props', week: 11, topic: 'w11-embed', title: 'Embedding properties', imp: 3, kind: 'facts',
    html: `Similar words cluster (countries; nephew/niece/uncle/aunt; car/truck/bicycle).<br><span class="k">Analogy</span> A:B :: C:D ⇔ B − A ≈ D − C → D ≈ C + (B − A).<br>nephew:uncle :: niece:aunt; Athens:Greece :: Oslo:Norway; copper:Cu :: gold:Au; mouse:mice :: dollar:dollars; walking:walked :: swimming:swam.`,
  },
  {
    id: 'w11-autoregress', week: 11, topic: 'w11-embed', title: 'Autoregression & generation', imp: 2, kind: 'facts',
    html: `Chain rule: P(w₁…w<sub>N</sub>) = Π P(wᵢ | w₁…wᵢ₋₁).<br><span class="k">Autoregressive</span>: predict next token from past ones; output is appended to the input ("I ate an" → "apple" → "today" …) → discriminative model used generatively.<br>Output embedding ≠ any word → similarity to every word (cosine/Euclidean) as logits → softmax → pick or sample.`,
  },
  {
    id: 'w11-rnn-caveats', week: 11, topic: 'w11-attn', title: 'RNN caveats → attention', imp: 3, kind: 'facts',
    html: `RNN: <b>long signal paths</b> (long-range dependencies hard), <b>poor interpretability</b>, <b>low parallelisation</b>.<br>Attention: all keys positionally equal → long-range easy; softmax weights interpretable; parallel; but needs positional encoding.<br>Transformer: Vaswani 2017; GPT: Radford 2018; BERT: Devlin 2018.`,
  },
  {
    id: 'w11-attn-formula', week: 11, topic: 'w11-attn', title: 'Scaled dot-product attention', imp: 3, kind: 'formula',
    html: `Attention(Q, K, V) = softmax(QKᵀ/√d<sub>k</sub>) V<br>Q queries, K keys (dim d<sub>k</sub>), V values (dim d<sub>v</sub>).<br>Query · each key = similarity → ÷√d<sub>k</sub> → softmax (weights ≥ 0, sum 1) → weighted average (convex combination) of values.<br>softmax(z)ᵢ = e<sup>zᵢ</sup>/Σⱼe<sup>zⱼ</sup>`,
  },
  {
    id: 'w11-attn-worked', week: 11, topic: 'w11-attn', title: 'Attention worked (drinks)', imp: 3, kind: 'worked',
    html: `Keys: apple [0.9, 0.1], lemon [0.2, 0.8]; d<sub>k</sub> = 2 → ÷√2 = ÷1.414.<br>Alice q [0.8, 0.2]: 0.8·0.9 + 0.2·0.1 = 0.74; 0.8·0.2 + 0.2·0.8 = 0.32 → [0.523, 0.226] → e: 1.687, 1.254 → <b>[0.574, 0.426]</b>.<br>Bob q [0.4, 0.6]: [0.42, 0.56] → [0.297, 0.396] → <b>[0.475, 0.525]</b>.<br>2 keys: p₁ = 1/(1 + e<sup>s₂ − s₁</sup>).`,
  },
  {
    id: 'w11-self-attn', week: 11, topic: 'w11-attn', title: 'Self-attention', imp: 3, kind: 'facts',
    html: `Q = K = V = the same word embeddings. Normalised keys + query equal to a key → each word attends to itself: useless.<br>Fix: learnable linear projections (fully connected layers): Attention(QW<sup>Q</sup>, KW<sup>K</sup>, VW<sup>V</sup>) → inputs differ after projection; inter-word dependencies stored in W<sup>Q</sup>, W<sup>K</sup>, W<sup>V</sup>.`,
  },
  {
    id: 'w11-multihead', week: 11, topic: 'w11-attn', title: 'Multi-head attention', imp: 2, kind: 'formula',
    html: `headᵢ = Attention(QWᵢ<sup>Q</sup>, KWᵢ<sup>K</sup>, VWᵢ<sup>V</sup>); MultiHead = Concat(head₁…head<sub>h</sub>)W<sup>O</sup>.<br>Heads attend to different keys/concepts jointly (crucial for long contexts, e.g. a book).<br>d<sub>k</sub> = d<sub>v</sub> = d<sub>model</sub>/h → more heads at about the same cost (512/8 = 64; scale ÷√64 = ÷8).`,
  },
  {
    id: 'w11-masking', week: 11, topic: 'w11-attn', title: 'Masked attention', imp: 3, kind: 'facts',
    html: `Decoder self-attention: a position may attend only up to itself → scores of future positions set to −∞ before softmax → weight 0 → no leftward information flow (GPT).<br>Weight matrix becomes lower-triangular (w₁,₂ = w₁,₃ = 0, …).`,
  },
  {
    id: 'w11-pos-enc', week: 11, topic: 'w11-attn', title: 'Positional encoding', imp: 2, kind: 'formula',
    html: `Attention treats all positions equally → add a positional encoding to each embedding (same dimension, so they can be added).<br>Fixed: PE(pos, 2i) = sin(pos/10000<sup>2i/d</sup>), PE(pos, 2i+1) = cos(pos/10000<sup>2i/d</sup>); pos 1, d = 50 → [0.841, 0.540, 0.638, 0.770, …].<br>Or learned with the model → nearly identical results.`,
  },
  {
    id: 'w11-bert-gpt', week: 11, topic: 'w11-transformer', title: 'BERT vs GPT', imp: 3, kind: 'compare',
    html: `<table class="cs"><tr><th></th><th>BERT</th><th>GPT</th></tr><tr><td>block</td><td>encoder</td><td>decoder</td></tr><tr><td>context</td><td>both sides</td><td>preceding only</td></tr><tr><td>pre-training</td><td>MLM + NSP</td><td>next word</td></tr><tr><td>for</td><td>classification</td><td>generation</td></tr></table>BERT = bidirectional; GPT = unidirectional (masked).`,
  },
  {
    id: 'w11-attn-layers', week: 11, topic: 'w11-transformer', title: 'Transformer attention layers', imp: 2, kind: 'facts',
    html: `<b>Encoder self-attention</b>: input = previous encoder layer; each position attends to all positions.<br><b>Encoder–decoder attention</b>: K, V = encoder output; Q = previous decoder layer; attends to all input positions.<br><b>Decoder self-attention</b>: input = previous decoder layer; only up to its own position (masked).`,
  },
  {
    id: 'w11-bert-gpt-train', week: 11, topic: 'w11-transformer', title: 'BERT & GPT training', imp: 2, kind: 'facts',
    html: `<b>BERT</b>: MLM = predict words masked anywhere; NSP = does sentence B follow A? Input = token + segment + position embeddings; [CLS], [SEP]. Fine-tune by swapping inputs/outputs (QA, NER, MNLI).<br><b>GPT</b>: language modelling L₁ = Σᵢ log P(wᵢ | wᵢ₋ₖ…wᵢ₋₁) (k = context window); fine-tune with an extra fully connected layer; LM as auxiliary objective.`,
  },
  {
    id: 'w11-transfer-nlp', week: 11, topic: 'w11-transformer', title: 'Pre-training & fine-tuning', imp: 3, kind: 'facts',
    html: `<b>Pre-train</b> on lots of data (wide <i>source domain</i>): raw corpus is cheap, word order holds syntax &amp; semantics → predict next / masked words (no expert labels).<br><b>Fine-tune</b>: start from pretrained weights, train on smaller annotated <i>target</i> data → downstream tasks: generation, question answering, sentiment, inference.`,
  },

  // ───────────────────────────── Week 12: practical ML & ethics ─────────────────────────────
  {
    id: 'w12-splits', week: 12, topic: 'w12-practical', title: 'TVT vs k-fold CV sizes', imp: 3, kind: 'compare',
    html: `500 examples: TVT 60/20/20 = 300/100/100; 10-fold CV + test 80/20 = 400/100 (360 per training fold).<br>1,000,000: TVT 98/1/1; CV 99:1.<br>CV: better for small data; less overfitting to VAL; average repeats (10 × 10-fold). Big data: 1% val/test is plenty.`,
  },
  {
    id: 'w12-baselines', week: 12, topic: 'w12-practical', title: 'Baselines & improving', imp: 3, kind: 'rule',
    html: `Baseline: regression → predict the <b>mean</b>; classification → majority class (99:1 skew → 99% accuracy!). Or simple: kNN, linear/logistic regression, 1 tree, 1-layer NN.<br>Improve: debug first (run NN 1 epoch); other models; hyperparameters; more features; more data; better features; better data.`,
  },
  {
    id: 'w12-flowchart', week: 12, topic: 'w12-practical', title: 'Training error vs gap', imp: 3, kind: 'rule',
    html: `E<sub>hold-out</sub> = E<sub>train</sub> + (E<sub>hold-out</sub> − E<sub>train</sub>) = training error + generalisation gap.<br>1) High training error? → more flexible model, less regularisation, train NN longer, more features; repeat.<br>2) Else high gap? → less flexible, more regularisation, early stopping, bagging, more data; repeat.<br>3) Else done.`,
  },
  {
    id: 'w12-knobs', week: 12, topic: 'w12-practical', title: 'Overfitting knobs, all models', imp: 3, kind: 'table',
    html: `Overfit → move each knob (both columns):<table class="cs"><tr><td>Ridge/Lasso α ↑</td><td>LogReg/SVM C ↓</td></tr><tr><td>RBF SVM γ ↓</td><td>GP length scale ↑</td></tr><tr><td>kNN k ↑</td><td>tree depth, degree ↓</td></tr><tr><td>GB trees, LR ↓</td><td>dropout, L2 ↑</td></tr></table>Overfit also: early stopping, more data, bagging. Underfit: reverse every arrow, more features, train longer.`,
  },
  {
    id: 'w12-mismatch', week: 12, topic: 'w12-practical', title: 'Train–val mismatch', imp: 3, kind: 'facts',
    html: `Training data from a slightly different distribution → hold out <b>train-val</b> data from it:<br>E<sub>hold-out</sub> = E<sub>train</sub> + (E<sub>train-val</sub> − E<sub>train</sub>) [gap] + (E<sub>hold-out</sub> − E<sub>train-val</sub>) [mismatch].<br>Extra data B (200k) vs target A (10k): put B (+ some A) in <b>training only</b>; val &amp; test only from A.`,
  },
  {
    id: 'w12-error-analysis', week: 12, topic: 'w12-practical', title: 'Error analysis (vehicles)', imp: 2, kind: 'worked',
    html: `90% val accuracy → 10% error; inspect 100 misclassified:<br>10 dark pedestrians with reflectors → "bike": fix gains ≤ ~1% (10% of 10%).<br>30 tilted → ≤ ~3%. 15 mislabelled → ≤ ~1.5%.<br>Max gain = share of errors × error rate → fix biggest first.`,
  },
  {
    id: 'w12-data-issues', week: 12, topic: 'w12-practical', title: 'Missing data, outliers, features', imp: 2, kind: 'facts',
    html: `Missing: why? at random vs systematically; some learners cope; else drop or impute (mean/mode, prediction model).<br>Outliers: far from the curve (regression) or deep in the other class.<br>Redundant ≠ irrelevant: redundant OK for RF, bad for linear models. Implicit selection: Lasso, PCA; explicit: filter- or wrapper-based.`,
  },
  {
    id: 'w12-trust', week: 12, topic: 'w12-practical', title: 'Trust, augmentation, transfer', imp: 2, kind: 'facts',
    html: `Understand single predictions and the full model; worst-case guarantees ≈ impossible.<br>Regression: <b>prediction intervals</b> ("river 2.05 m, 95% in [1.89, 2.21]").<br>Classification: confidence ("Tui, 98%").<br>Augmentation (tilt, flip, crop) and transfer learning (retrain last layers) also help in practice.`,
  },
  {
    id: 'w12-fairness', week: 12, topic: 'w12-ethics', title: 'Fairness metrics per group', imp: 3, kind: 'worked',
    html: `Slide tables: rows = <b>predicted</b>, cols = actual (≠ sklearn).<br>Non-Swedes TN 300, FN 100, FP 100, TP 100; Swedes TN 400, FN 50, FP 350, TP 400.<br>FNR = FN/(FN + TP): .50 vs .11 → interested non-Swede <b>4.5×</b> likelier not recommended.<br>FPR = FP/(FP + TN): .25 vs .47 → Swedes ~<b>2×</b> more unwanted recommendations.`,
  },
  {
    id: 'w12-compas', week: 12, topic: 'w12-ethics', title: 'COMPAS & impossibility', imp: 3, kind: 'facts',
    html: `COMPAS (Black vs White): FPR 44.8% vs 23.4%; TPR 72% vs 52.2%; precision 63% vs 59.1%; reoffend ≈ 51% vs 39%.<br><span class="k">Impossible</span> in general to equalise precision AND TPR AND FPR across groups; only with a perfect model or equal base rates.<br>COMPAS AUC ≈ 0.7; LogReg on age + #priors ≈ 0.73.`,
  },
  {
    id: 'w12-auc', week: 12, topic: 'w12-ethics', title: 'What AUC 0.7 means', imp: 3, kind: 'facts',
    html: `For a random (positive, negative) pair, the predicted probabilities order them correctly 70% of the time, <b>wrongly 30%</b>.<br>Pros: no threshold; compares models. But not a measure of binary <b>decision</b> quality (decisions need a threshold).`,
  },
  {
    id: 'w12-overselling', week: 12, topic: 'w12-ethics', title: 'Overselling & awareness', imp: 2, kind: 'facts',
    html: `Issues: privacy (medical, social, financial data), surveillance, weapons, deep fakes, cyber crime.<br>Hinton 2016: DL beats radiologists within 5–10 years (retracted 2023). Musk 2020: level-5 car by year end.<br>Cambridge Analytica: personality → influence voters. Medical imaging: flawed designs; RF/NN/SVM often no better than LogReg.`,
  },
  {
    id: 'w12-acc', week: 12, topic: 'w12-ethics', title: 'NZ ACC claims system', imp: 1, kind: 'facts',
    html: `~90% of claims are easy → asymmetric system: classifier on claim text; "approve" → approved; otherwise a human assessor.<br>QC: humans re-check a few random approvals.`,
  },
];
