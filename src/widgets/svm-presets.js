// Datasets for the svm-margin widget (pure data, shared with tools/check-svm.mjs).
// Class A = circles (t = +1), class B = crosses (t = −1).
const P = (c, arr) => arr.map(([x, y]) => ({ x, y, c }));

export const PRESETS = {
  separable: {
    label: 'Separable',
    domain: { x: [0, 10], y: [0, 7] },
    points: [
      ...P('A', [[1.2, 1.6], [2.2, 3.0], [1.0, 4.4], [2.8, 1.0], [3.4, 2.4], [2.0, 5.6], [4.0, 3.6], [4.6, 1.4]]),
      ...P('B', [[6.2, 5.8], [7.0, 4.2], [8.2, 6.0], [7.6, 2.6], [8.8, 3.8], [9.2, 5.4], [5.8, 6.6], [8.6, 1.4]]),
    ],
    hint: 'Drag a point that is not ringed: the street does not move. Drag a ringed one (a support vector) and it does.',
  },
  outlier: {
    label: 'Outlier',
    domain: { x: [0, 10], y: [0, 7] },
    points: [
      ...P('A', [[1.0, 1.2], [1.8, 2.6], [1.2, 3.8], [2.6, 1.4], [3.0, 3.0], [2.2, 4.8], [3.8, 2.0], [4.2, 0.8]]),
      ...P('B', [[6.6, 4.8], [7.4, 3.6], [8.2, 5.6], [7.0, 6.2], [8.8, 4.2], [6.0, 6.4], [9.0, 6.4], [8.4, 2.6]]),
      ...P('A', [[6.0, 3.9]]),
    ],
    hint: 'One class-A point sits next to class B. High C squeezes the street around it; lower C to about 1 and the street widens, accepting a violation.',
  },
  unscaled: {
    label: 'Unscaled',
    // slide W8 s4 (Géron's example): x₀ in 0–6, x₁ in 0–80
    domain: { x: [0, 6], y: [0, 90] },
    zDomain: { x: [-2.5, 2.5], y: [-2, 2] },
    scalable: true,
    points: [...P('A', [[3, 80], [5, 60]]), ...P('B', [[1, 50], [5, 20]])],
    hint: 'x₁ spans 0–80 but x₀ only 0–6, so the street is squeezed along x₁. Switch on Standardise.',
  },
  exam2019: {
    label: '2019 Q51',
    domain: { x: [0, 18], y: [-0.5, 9.5] },
    exam: true,
    swapColours: true, // the paper has red circles and blue crosses
    points: [
      ...P('A', [[0.71, 7.46], [1.41, 5.03], [1.74, 1.72], [2.83, 6.37], [3.23, 5.28], [3.61, 3.68], [3.61, 0.9], [3.97, 7.64], [3.99, 2.4], [5.11, 4.09], [6.21, 6.24]]),
      ...P('B', [[10.01, 6.21], [12.23, 6.34], [12.77, 8.14], [13.05, 3.04], [14.73, 3.5], [14.83, 5.17], [15.1, 7.84], [15.49, 1.08], [16.03, 6.34], [17.11, 2.89]]),
    ],
    hint: 'Click the points you think are support vectors, then press Check.',
  },
};
