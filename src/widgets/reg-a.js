// Widgets registered by team a (Week 7: ensembles). See reg-core.js for the entry shape.
import VotingCalc from './VotingCalc.jsx';
import EnsembleAccuracy from './EnsembleAccuracy.jsx';
import BootstrapOob from './BootstrapOob.jsx';
import AdaboostSteps from './AdaboostSteps.jsx';
import GradboostResiduals from './GradboostResiduals.jsx';

export default [
  {
    id: 'voting-calc',
    title: 'Hard vs soft voting',
    week: 7,
    topic: 'w7-voting',
    blurb: 'Count votes or average probabilities: see when hard and soft voting pick different classes (FAQ3, 2024 test).',
    C: VotingCalc,
    tool: true,
  },
  {
    id: 'ensemble-accuracy',
    title: 'Why voting helps',
    week: 7,
    topic: 'w7-voting',
    blurb: 'Majority-vote accuracy of n voters from the binomial: 3 × 60% → 64.8%, and why correlated or worse-than-chance voters gain nothing.',
    C: EnsembleAccuracy,
    tool: true,
  },
  {
    id: 'bootstrap-oob',
    title: 'Bootstrap sampling & out-of-bag',
    week: 7,
    topic: 'w7-bagging',
    blurb: 'Draw bootstrap bags of 100 from 100 and watch about 37% stay out-of-bag, the free validation set behind oob_score_.',
    C: BootstrapOob,
  },
  {
    id: 'adaboost-steps',
    title: 'AdaBoost reweighting',
    week: 7,
    topic: 'w7-boost',
    blurb: "The lecture's 10-instance AdaBoost example round by round: error r, say α, reweighting and the weighted vote.",
    C: AdaboostSteps,
    tool: true,
  },
  {
    id: 'gradboost-residuals',
    title: 'Gradient boosting on residuals',
    week: 7,
    topic: 'w7-boost',
    blurb: 'Watch each regression tree fit the residuals of the ones before it, and pick the number of trees by early stopping.',
    C: GradboostResiduals,
  },
];
