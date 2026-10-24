// Widgets registered by team d (weeks 2-6 refreshers). See reg-core.js for the entry shape.
import KnnDemo from './KnnDemo.jsx';
import GiniCalc from './GiniCalc.jsx';
import MetricsThreshold from './MetricsThreshold.jsx';
import GdLearningRate from './GdLearningRate.jsx';
import BiasVariance from './BiasVariance.jsx';
import Activations from './Activations.jsx';
import DenseParams from './DenseParams.jsx';

export default [
  {
    id: 'knn-demo',
    title: 'k-nearest neighbours',
    week: 2,
    topic: 'w2-knn',
    blurb: 'The lecture toy example: distances to the query, the k-circle and the majority vote for k = 1 to 6, plus what an unscaled feature does.',
    C: KnnDemo,
  },
  {
    id: 'gini-calc',
    title: 'Impurity of a tree node',
    week: 2,
    topic: 'w2-trees',
    blurb: 'Gini, entropy and misclassification for any class counts, and the weighted impurity decrease of a split, checked on the iris tree from the slides.',
    C: GiniCalc,
    tool: true,
  },
  {
    id: 'metrics-threshold',
    title: 'Precision, recall and the threshold',
    week: 4,
    topic: 'w4-metrics',
    blurb: 'Slide a decision threshold over 24 scores and watch the confusion matrix, precision, recall, F1 and the PR/ROC curves; or type counts to check a test question.',
    C: MetricsThreshold,
    tool: true,
  },
  {
    id: 'gd-learning-rate',
    title: 'Gradient descent and the learning rate',
    week: 5,
    topic: 'w5-gd',
    blurb: 'Too small, good, oscillating and diverging learning rates on a 1-D bowl, then batch vs mini-batch vs stochastic paths and what unscaled features do.',
    C: GdLearningRate,
  },
  {
    id: 'bias-variance',
    title: 'Bias, variance and model complexity',
    week: 3,
    topic: 'w3-biasvar',
    blurb: 'The bull’s-eye picture of bias and variance, then polynomial fits of degree 1 to 15 with training and validation error showing underfitting and overfitting.',
    C: BiasVariance,
  },
  {
    id: 'activations',
    title: 'Activation functions and vanishing gradients',
    week: 6,
    topic: 'w6-dnn',
    blurb: 'Step, sigmoid, tanh and ReLU with their slopes: see where sigmoid and tanh saturate and how slopes multiply into vanishing gradients.',
    C: Activations,
  },
  {
    id: 'dense-params',
    title: 'Keras model builder and parameter counts',
    week: 6,
    topic: 'w6-mlp',
    blurb: 'Build a Sequential model of Dense layers, pick the task, and read off model.summary() parameter counts, the output layer, the loss and the Keras code.',
    C: DenseParams,
    tool: true,
  },
];
