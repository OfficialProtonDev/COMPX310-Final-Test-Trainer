// Week 1 written prompt (Test 1 Q42 style).
export default [
  {
    id: 'wr-01-01',
    week: 1,
    topic: 'w1-types',
    kind: 'explain',
    marks: 5,
    prompt: `TYPES OF LEARNING: What is supervised learning, and what are its two main types? What is unsupervised learning? Name three different types of unsupervised learning. Briefly explain where semi-supervised learning and reinforcement learning fit in. (5 marks)`,
    points: [
      { m: 1, text: `Supervised learning: the training data are labelled, i.e. every example has a specified target (label) to predict from its features (e.g. spam / not_spam).` },
      { m: 1, text: `Two main types: classification (nominal/categorical target; binary or multi-class, e.g. spam detection) and regression (numeric target, e.g. the value of a used car).` },
      { m: 1, text: `Unsupervised learning: no target / no labels; making sense of unlabelled data ("learning without a teacher").` },
      { m: 1, text: `Three types: clustering (grouping similar items, e.g. K-Means, DBSCAN); anomaly / novelty detection (finding unusual examples, e.g. credit-card fraud); dimensionality reduction / visualisation (e.g. PCA, t-SNE). Association rule learning (e.g. Apriori) is also listed on W1 s15, but the 2025 model answer brackets it as "not covered", so give it only as a fourth.` },
      { m: 0.5, text: `Semi-supervised: many unlabelled plus a few labelled examples, often combining supervised and unsupervised methods; useful because labels are expensive.` },
      { m: 0.5, text: `Reinforcement learning: an agent observes an environment, takes actions, receives rewards or penalties and updates its policy to maximise reward over time, balancing exploration and exploitation (e.g. AlphaGo).` },
    ],
    model: `<b>Supervised learning</b> uses labelled data: each training example has a specified target that the model learns to predict from the features. The two main types are <b>classification</b>, where the target is nominal (binary, e.g. spam/not spam, or multi-class), and <b>regression</b>, where the target is numeric (e.g. the price of a used car from its mileage, age and brand).<br><b>Unsupervised learning</b> analyses data without a specific target: it tries to make sense of unlabelled data. Types: <b>clustering</b> (grouping similar items, e.g. K-Means, DBSCAN), <b>anomaly/novelty detection</b> (finding unusual items, e.g. credit-card fraud or network intrusion) and <b>dimensionality reduction</b>, particularly useful for visualisation (e.g. PCA, t-SNE); association rule learning (Apriori) is a fourth.<br><b>Semi-supervised learning</b> sits in between: many unlabelled and a few labelled examples, often combining both kinds of methods; very useful because labels are often expensive. <b>Reinforcement learning</b> is different again: an agent acts in an environment, receives rewards or penalties, and updates its policy (strategy) to maximise reward over time, combining exploration with exploitation (e.g. AlphaGo).`,
    src: 'W1 s10-22',
  },
];
