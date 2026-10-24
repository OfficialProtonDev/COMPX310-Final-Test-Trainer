// Widgets registered by team c. See reg-core.js for the entry shape.
import CurseDim from './CurseDim.jsx';
import PcaExplorer from './PcaExplorer.jsx';
import KmeansStepper from './KmeansStepper.jsx';
import DbscanLab from './DbscanLab.jsx';
import AttentionCalc from './AttentionCalc.jsx';
import EmbeddingAnalogy from './EmbeddingAnalogy.jsx';
import FitDiagnosis from './FitDiagnosis.jsx';
import FairnessCalc from './FairnessCalc.jsx';

export default [
  {
    id: 'curse-dim',
    title: 'Curse of dimensionality',
    week: 10,
    topic: 'w10-pca',
    blurb: 'Slide d up to a million: nearly every point ends up near a border and random points drift far apart.',
    C: CurseDim,
  },
  {
    id: 'pca-explorer',
    title: 'PCA explorer',
    week: 10,
    topic: 'w10-pca',
    blurb: 'Turn a line through a 2-D cloud to find the direction of most variance (PC1), then pick d from a cumulative explained-variance plot.',
    C: PcaExplorer,
  },
  {
    id: 'kmeans-stepper',
    title: 'k-means step by step',
    week: 10,
    topic: 'w10-kmeans',
    blurb: 'Alternate assign and update steps, watch inertia fall, hit a bad local optimum, and choose k with the elbow or silhouette score.',
    C: KmeansStepper,
  },
  {
    id: 'dbscan-lab',
    title: 'DBSCAN core, border & outlier points',
    week: 10,
    topic: 'w10-dbscan',
    blurb: 'Change ε and min_samples and watch every point relabel as core, border or outlier; the number of clusters falls out by itself.',
    C: DbscanLab,
    tool: true,
  },
  {
    id: 'dbscan-exam',
    title: '2019 paper Q53: label the DBSCAN points',
    week: 10,
    topic: 'w10-dbscan',
    blurb: 'Label the seven points of the 2019 practice paper as C, B or O for min_samples 2 and 3, then check your answers.',
    C: DbscanLab,
    props: { preset: 'exam2019' },
  },
  {
    id: 'attention-calc',
    title: 'Scaled dot-product attention',
    week: 11,
    topic: 'w11-attn',
    blurb: 'Work the lecture’s Alice and Bob drinks example through q·k, ÷√d_k and softmax, then see a causal mask zero out future words.',
    C: AttentionCalc,
    tool: true,
  },
  {
    id: 'embedding-analogy',
    title: 'Word analogies',
    week: 11,
    topic: 'w11-embed',
    blurb: 'Solve “A is to B as C is to ?” with D ≈ C + (B − A) in a toy embedding and rank the nearest words by cosine similarity.',
    C: EmbeddingAnalogy,
  },
  {
    id: 'fit-diagnosis',
    title: 'Diagnose under/overfitting',
    week: 12,
    topic: 'w12-practical',
    blurb: 'Split the hold-out error into training error, generalisation gap and train-val mismatch, and follow the W12 flowchart to the right fix.',
    C: FitDiagnosis,
    tool: true,
  },
  {
    id: 'fairness-calc',
    title: 'Group fairness calculator',
    week: 12,
    topic: 'w12-ethics',
    blurb: 'Compare base rate, TPR, FNR, FPR and precision between two groups (Swedish course recommendations, COMPAS) and see why not all can be equal.',
    C: FairnessCalc,
    tool: true,
  },
];
