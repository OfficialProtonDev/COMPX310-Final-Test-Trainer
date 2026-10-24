// Week 4 written prompts: cross-validation (explain) and confusion-matrix metrics (worked).
export default [
  {
    id: 'wr-04-01',
    week: 4,
    topic: 'w4-cv',
    kind: 'explain',
    marks: 5,
    prompt: `CROSS-VALIDATION: You have 2,000 labelled training examples (only 10% of them positive) and want to estimate how well a classifier will do on new data. Explain how k-fold cross-validation works, and give its advantages and its main disadvantage compared with a single train/validation split. What is stratified cross-validation, and why does it matter here? What is a common value for k, and why is it a good default? (5 marks)`,
    points: [
      { m: 1, text: `The training data are split into k equal-sized folds; train on k − 1 folds together and evaluate on the remaining held-out fold.` },
      { m: 1, text: `Repeat k times so that every fold is the validation fold once → k results (e.g. k accuracies); report their mean and standard deviation.` },
      { m: 1, text: `Advantages over one split: every example is used for validation exactly once, so the estimate is more precise / reliable and does not hinge on one lucky or unlucky split, and the std shows its spread. Disadvantage: about k times the runtime.` },
      { m: 1, text: `Stratified CV: every fold mirrors the class distribution of the whole dataset as closely as possible (here ≈ 10% positives per fold), so no fold ends up with too few positives.` },
      { m: 1, text: `Common default k = 10: each model trains on 90% of the data (here 1,800 of 2,000), so it behaves much like a model trained on all of it; 10 results are enough to average; "only" 10× the runtime.` },
    ],
    model: `k-fold cross-validation splits the <b>training</b> data into k equal-sized folds. It trains a model on k − 1 folds and evaluates it on the remaining held-out fold, and repeats this k times so that each fold is held out exactly once. This gives k results (e.g. k accuracy values), from which we compute a mean and a standard deviation.<br>Compared with a single train/validation split, every example is used once for validation, so the estimate is more precise and does not depend on one particular split, and the standard deviation shows how stable it is. The disadvantage is that the runtime is about k times higher. (CV can also be repeated with different random seeds to reduce the variance further.)<br><b>Stratified</b> cross-validation makes every fold mirror the global class distribution as closely as possible. Here only 10% of the examples are positive, so each fold should get about 10% positives (20 of 200); otherwise some folds could contain very few positives and give misleading scores.<br>A common default is <b>k = 10</b>: each model is trained on 90% of the data (1,800 examples, folds of 200), which should behave almost like a model trained on 100%; 10 results are fine to average, and it "only" costs 10× the runtime.`,
    src: 'W4 s6-10, W1 s30',
  },
  {
    id: 'wr-04-02',
    week: 4,
    topic: 'w4-metrics',
    kind: 'worked',
    marks: 5,
    prompt: `CLASSIFICATION METRICS: A classifier flags credit-card transactions as fraudulent (positive) so that a person can check them. On 1,000 test transactions, scikit-learn's <code>confusion_matrix(y_true, y_pred)</code> returns [[880, 20], [40, 60]] (rows = actual, columns = predicted):<br><table class="mini"><tr><th></th><th>predicted not fraud</th><th>predicted fraud</th></tr><tr><th>actual not fraud</th><td>880</td><td>20</td></tr><tr><th>actual fraud</th><td>40</td><td>60</td></tr></table>(a) Compute the accuracy, and the precision, recall and F1 score for the fraud class, showing your working. (b) Missing a fraud is expensive, while a false alarm only costs a quick manual check. Which metric matters most here, and why is the accuracy misleading? (5 marks)`,
    points: [
      { m: 1, text: `Read the matrix correctly: TN = 880, FP = 20, FN = 40, TP = 60. Accuracy = (TP + TN)/total = (60 + 880)/1000 = 0.94.` },
      { m: 1, text: `Precision = TP/(TP + FP) = 60/80 = 0.75 (of the flagged transactions, 75% really are fraud).` },
      { m: 1, text: `Recall = TP/(TP + FN) = 60/100 = 0.60 (we catch 60% of the frauds).` },
      { m: 1, text: `F1 = 2PR/(P + R) = 2 · 0.75 · 0.60 / (0.75 + 0.60) = 0.9/1.35 = 2/3 ≈ 0.67 (equivalently TP/(TP + (FN + FP)/2) = 60/90).` },
      { m: 1, text: `Recall matters most, since false negatives are costly and false positives cheap (e.g. lower the threshold, or use F-beta with β > 1). Accuracy is misleading because the data are imbalanced: always predicting "not fraud" already scores 900/1000 = 0.90 while catching no fraud.` },
    ],
    model: `(a) Layout [[TN, FP], [FN, TP]] → TN = 880, FP = 20, FN = 40, TP = 60.<br>Accuracy = (60 + 880)/1000 = 940/1000 = <b>0.94</b>.<br>Precision = 60/(60 + 20) = 60/80 = <b>0.75</b>.<br>Recall = 60/(60 + 40) = 60/100 = <b>0.60</b>.<br>F1 = 2 · 0.75 · 0.60/(0.75 + 0.60) = 0.90/1.35 = <b>2/3 ≈ 0.67</b> (check: 60/(60 + (40 + 20)/2) = 60/90).<br>(b) <b>Recall</b> is the key metric: a missed fraud (false negative) is expensive, while a false alarm (false positive) only costs a quick check, so we want to find as many of the real frauds as possible, even at some cost in precision, e.g. by lowering the decision threshold or optimising F-beta with β > 1 (recall weighted more). The accuracy of 0.94 looks good, but only 10% of the transactions are fraud: a classifier that never flags anything would already reach 0.90 while catching no fraud at all.`,
    src: 'W4 s11-17',
  },
];
