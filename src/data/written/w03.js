// Week 3 written prompt.
export default [
  {
    id: 'wr-03-01',
    week: 3,
    topic: 'w3-biasvar',
    kind: 'explain',
    marks: 5,
    prompt: `BIAS AND VARIANCE: Explain the bias/variance trade-off. How do you recognise underfitting and overfitting from learning curves (training and validation error plotted against the training-set size)? Give remedies for each, including the role of regularisation such as Ridge's α. (5 marks)`,
    points: [
      { m: 1, text: `Generalisation error = bias + variance + irreducible error. Bias = error from wrong assumptions (e.g. a linear model for quadratic data); variance = sensitivity to small changes in the training data; irreducible error = noise in the data (only cleaning the data helps).` },
      { m: 0.5, text: `Trade-off: higher model complexity → lower bias but higher variance; lower complexity → lower variance but higher bias. The best model on new data balances the two.` },
      { m: 1, text: `Underfitting (high bias) on learning curves: training and validation error are both high, close together and flat (plateau); adding more data does not help.` },
      { m: 1, text: `Overfitting (high variance): the training error is much lower than the validation error (a large gap), and the gap narrows as more training data are added.` },
      { m: 0.5, text: `Underfitting remedies: a more complex model (more parameters, e.g. a higher polynomial degree), better features, weaker regularisation (smaller α).` },
      { m: 1, text: `Overfitting remedies: more training data, less noise, a simpler / more constrained model, i.e. regularisation such as Ridge (L2) or Lasso (L1) with a larger α (α = 0 is plain linear regression; α → ∞ gives a flat line through the mean).` },
    ],
    model: `Generalisation error = bias + variance + irreducible error. <b>Bias</b> comes from wrong assumptions (e.g. fitting a line to quadratic data) and causes underfitting; <b>variance</b> is the model's sensitivity to small changes in the training data and causes overfitting; the <b>irreducible error</b> is noise in the data, which only cleaning the data can reduce. More complex models have lower bias but higher variance, simpler models the reverse, so the best model on new data is the one with the best trade-off.<br><b>Learning curves:</b> if the training and validation errors are both high, close together and have flattened out, the model underfits (e.g. linear regression on quadratic data, both ≈ 1.8 RMSE), and more data will not help. If the training error is much lower than the validation error (a large gap that shrinks as data are added, e.g. a degree-10 polynomial), the model overfits.<br><b>Underfitting:</b> use a more complex model (more parameters, higher polynomial degree), better features, or weaker regularisation (smaller α). <b>Overfitting:</b> get more data, reduce noise, or use a simpler / more constrained model. Constraining the model is regularisation: e.g. Ridge adds α·½Σθ<sub>i</sub>² to the MSE (Lasso adds αΣ|θ<sub>i</sub>|); increasing α shrinks the weights (α = 0 is plain linear regression, a huge α gives a flat line through the mean).`,
    src: 'W3 s21-29, W1 s33-35, W4 s2-5',
  },
];
