// Group fairness rates from confusion matrices (W12b s3-7). Pure maths for FairnessCalc.jsx and tools/check-c.mjs.

const div = (a, b) => (b > 0 ? a / b : NaN);

/** Rates for one group: base rate (actual positives), TPR, FNR, FPR, precision (PPV), accuracy. */
export function rates({ tn, fp, fn, tp }) {
  const n = tn + fp + fn + tp;
  return {
    n,
    base: div(tp + fn, n),
    tpr: div(tp, tp + fn),
    fnr: div(fn, tp + fn),
    fpr: div(fp, fp + tn),
    ppv: div(tp, tp + fp),
    acc: div(tp + tn, n),
  };
}

export const PRESETS = {
  sweden: {
    label: 'Recommendations (Sweden)',
    names: ['Non-Swedes', 'Swedes'],
    neg: 'not interested',
    pos: 'interested',
    predNeg: 'not recommended',
    predPos: 'recommended',
    groups: [
      { tn: 300, fp: 100, fn: 100, tp: 100 },
      { tn: 400, fp: 350, fn: 50, tp: 400 },
    ],
  },
  compas: {
    label: 'COMPAS',
    names: ['Black defendants', 'White defendants'],
    neg: 'didn’t reoffend',
    pos: 'reoffended',
    predNeg: 'lower risk',
    predPos: 'higher risk',
    groups: [
      { tn: 990, fp: 805, fn: 532, tp: 1369 },
      { tn: 1139, fp: 349, fn: 461, tp: 505 },
    ],
  },
};
