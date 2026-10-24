// Widgets registered by team b (Weeks 8–9: SVMs, Bayesian linear regression, Gaussian processes).
// See reg-core.js for the entry shape.
import SvmMargin from './SvmMargin.jsx';
import KernelLift from './KernelLift.jsx';
import RbfGammaC from './RbfGammaC.jsx';
import BayesSlopes from './BayesSlopes.jsx';
import GpPlayground from './GpPlayground.jsx';

export default [
  {
    id: 'svm-margin',
    title: 'Large-margin linear SVM',
    week: 8,
    topic: 'w8-margin',
    blurb: 'Drag points to see that only the support vectors fix the street, how C trades margin width for violations, and why scaling matters.',
    C: SvmMargin,
  },
  {
    id: 'svm-exam',
    title: '2019 paper Q51: draw the hard-margin SVM',
    week: 8,
    topic: 'w8-margin',
    blurb: 'Mark the support vectors on the exam data, check your answer, then reveal the boundary and the margin.',
    C: SvmMargin,
    props: { preset: 'exam2019' },
  },
  {
    id: 'kernel-lift',
    title: 'Making 1-D data separable',
    week: 8,
    topic: 'w8-kernel',
    blurb: 'Lift 1-D points with an x² feature or RBF similarities to two landmarks until a straight line separates them.',
    C: KernelLift,
  },
  {
    id: 'rbf-gamma-c',
    title: 'RBF SVM: γ and C',
    week: 8,
    topic: 'w8-kernel',
    blurb: 'Train an RBF-kernel SVM on moons and see small γ/C underfit and large γ/C overfit, as on the slide grid.',
    C: RbfGammaC,
  },
  {
    id: 'bayes-slopes',
    title: 'Prior × likelihood → posterior',
    week: 9,
    topic: 'w9-blr',
    blurb: 'Rebuild the slide table (10.7% / 78.7% / 10.7%), then watch a Bayesian regression line spread narrow as thermometer readings arrive.',
    C: BayesSlopes,
    tool: true,
  },
  {
    id: 'gp-playground',
    title: 'Gaussian process regression',
    week: 9,
    topic: 'w9-gp',
    blurb: 'Sample functions from a GP prior and posterior on the fish data; change the length scale, signal and noise and read off mean ± 2 std at 17 °C.',
    C: GpPlayground,
    tool: true,
  },
];
