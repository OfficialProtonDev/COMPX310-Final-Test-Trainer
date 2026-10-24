// Topic taxonomy. Every question, written prompt, widget and cheat-sheet block is tagged with one of these keys.
// half: 1 = Weeks 1-6 (about 1/3 of the 40 MCQs), 2 = Weeks 7-12 (about 2/3).
export const WEEKS = [
  { week: 1, title: 'Introduction to ML', short: 'Intro to ML', deck: 'W1 Intro' },
  { week: 2, title: 'Supervised learning: kNN & trees', short: 'kNN & trees', deck: 'W2 Ch2' },
  { week: 3, title: 'Parametric models & regularisation', short: 'Linear models', deck: 'W3 Ch3' },
  { week: 4, title: 'Model performance & metrics', short: 'CV & metrics', deck: 'W4 Ch4' },
  { week: 5, title: 'Data prep & gradient descent', short: 'Data prep & GD', deck: 'W5 Ch5' },
  { week: 6, title: 'Neural networks, DNNs & CNNs', short: 'Neural nets & CNNs', deck: 'W6 Ch6a/6b' },
  { week: 7, title: 'Ensembles & random forests', short: 'Ensembles', deck: 'W7 Ch7' },
  { week: 8, title: 'Kernels & SVMs', short: 'SVMs & kernels', deck: 'W8 Ch8' },
  { week: 9, title: 'Bayesian regression & Gaussian processes', short: 'Bayes & GPs', deck: 'W9 Ch9a/9b' },
  { week: 10, title: 'Dimensionality reduction & clustering', short: 'PCA & clustering', deck: 'W10 Ch10a/10b' },
  { week: 11, title: 'NLP, attention & transformers', short: 'NLP & attention', deck: 'W11 Ch11' },
  { week: 12, title: 'Practical ML & ethics', short: 'Practical & ethics', deck: 'W12 Ch12a/12b' },
];

export const TOPICS = [
  // ---- Weeks 1-6
  { key: 'w1-types', week: 1, name: 'Types of ML', blurb: 'supervised / unsupervised / semi-supervised / RL; batch vs online; instance- vs model-based' },
  { key: 'w1-basics', week: 1, name: 'ML workflow & data challenges', blurb: 'train/val/test splits, non-representative & poor data, overfitting vs underfitting basics' },
  { key: 'w2-knn', week: 2, name: 'kNN & preprocessing', blurb: 'k nearest neighbours, choosing k, normalisation, missing values' },
  { key: 'w2-trees', week: 2, name: 'Decision trees', blurb: 'axis-parallel splits, Gini/entropy, depth, regression trees, properties' },
  { key: 'w3-linear', week: 3, name: 'Linear, logistic & softmax regression', blurb: 'normal equation, logistic/sigmoid, softmax + cross-entropy, polynomial features, learning curves' },
  { key: 'w3-biasvar', week: 3, name: 'Bias/variance & fixing fit', blurb: 'bias-variance trade-off, bull\'s-eye, underfitting vs overfitting remedies' },
  { key: 'w3-reg', week: 3, name: 'Ridge, Lasso & Elastic Net', blurb: 'L2 vs L1 penalties, alpha, when to use which, scaling' },
  { key: 'w4-cv', week: 4, name: 'Validation & cross-validation', blurb: 'k-fold CV, stratified, generalisation gap, test-set misuse' },
  { key: 'w4-metrics', week: 4, name: 'Classification metrics', blurb: 'confusion matrix, precision, recall, F1, thresholds, PR/ROC/AUC, multiclass/multilabel' },
  { key: 'w5-prep', week: 5, name: 'Preparing data', blurb: 'missing values, label vs one-hot encoding, scaling (MinMax/Standard)' },
  { key: 'w5-gd', week: 5, name: 'Gradient descent', blurb: 'learning rate, batch vs stochastic vs mini-batch, momentum, grid search' },
  { key: 'w6-mlp', week: 6, name: 'Neural networks & Keras', blurb: 'perceptron, XOR, MLPs, activations, backprop, output layers & losses, Keras define/compile/fit' },
  { key: 'w6-dnn', week: 6, name: 'Training deep networks', blurb: 'vanishing gradients, batch norm, optimisers (Adam), LR schedules, transfer learning, dropout, regularisation' },
  { key: 'w6-cnn', week: 6, name: 'Convolutional networks', blurb: 'convolution, stride, padding, max pooling, CNN architectures, data augmentation, GPU memory' },
  // ---- Weeks 7-12
  { key: 'w7-voting', week: 7, name: 'Voting ensembles', blurb: 'hard vs soft voting, diversity, weak to strong learners, why voting helps' },
  { key: 'w7-bagging', week: 7, name: 'Bagging, pasting & OOB', blurb: 'bootstrap, with/without replacement, out-of-bag evaluation, random patches/subspaces' },
  { key: 'w7-rf', week: 7, name: 'Random forests & Extra-Trees', blurb: 'feature randomisation per split, extra-trees random thresholds, feature importance' },
  { key: 'w7-boost', week: 7, name: 'Boosting', blurb: 'AdaBoost weights/alpha, gradient boosting on residuals, learning rate vs #trees, early stopping, XGBoost' },
  { key: 'w7-stack', week: 7, name: 'Stacking', blurb: 'blender/meta-learner, hold-out subsets, multi-layer stacking' },
  { key: 'w8-margin', week: 8, name: 'Large-margin classification', blurb: 'street/margin, support vectors, hard vs soft margin, C, scaling, LinearSVC' },
  { key: 'w8-kernel', week: 8, name: 'Kernels & non-linear SVMs', blurb: 'polynomial features, kernel trick, RBF similarity, gamma & C effects, which kernel' },
  { key: 'w8-svr', week: 8, name: 'SVM regression & internals', blurb: 'epsilon-insensitive SVR, decision function, primal vs dual, hinge loss, complexity' },
  { key: 'w9-blr', week: 9, name: 'Bayesian linear regression', blurb: 'prior, likelihood, posterior, Gaussian noise, distribution over lines, BayesianRidge' },
  { key: 'w9-gp', week: 9, name: 'Gaussian processes', blurb: 'distribution over functions, kernels (RBF, White, DotProduct, periodic...), length scale, predictive std' },
  { key: 'w10-pca', week: 10, name: 'Dimensionality reduction & PCA', blurb: 'curse of dimensionality, projection vs manifold, PCA, explained variance, randomized/incremental PCA, t-SNE/UMAP' },
  { key: 'w10-kmeans', week: 10, name: 'K-means clustering', blurb: 'algorithm, inertia, k-means++, choosing k (elbow, silhouette), mini-batch, applications, semi-supervised use' },
  { key: 'w10-dbscan', week: 10, name: 'DBSCAN & anomaly detection', blurb: 'core/border/outlier, eps & min_samples, no predict(), other clusterers, outlier detectors' },
  { key: 'w11-embed', week: 11, name: 'Word representations', blurb: 'corpus/token/vocabulary, one-hot vs n-grams vs embeddings, analogies, autoregression' },
  { key: 'w11-attn', week: 11, name: 'Attention', blurb: 'RNN caveats, scaled dot-product attention, self-attention, multi-head, masking, positional encoding' },
  { key: 'w11-transformer', week: 11, name: 'Transformers, BERT & GPT', blurb: 'encoder vs decoder, BERT (MLM, NSP) vs GPT (next word), pre-training & fine-tuning' },
  { key: 'w12-practical', week: 12, name: 'Practical ML', blurb: 'splits, baselines, diagnosing train error vs gap, mismatch, augmentation, missing data, feature selection, trust' },
  { key: 'w12-ethics', week: 12, name: 'Ethics & fairness', blurb: 'fairness metrics per group, impossibility result, COMPAS, overselling, what AUC means' },
];

export const TOPIC = Object.fromEntries(TOPICS.map((t) => [t.key, t]));

// Expected number of the 40 MCQs per week in the real test (sums to 40: ~13 from W1-6, ~27 from W7-12).
export const MOCK_WEEK_QUOTA = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 3, 7: 5, 8: 5, 9: 4, 10: 6, 11: 4, 12: 3 };
