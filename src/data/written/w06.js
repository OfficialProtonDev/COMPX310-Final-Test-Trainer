// Week 6 written prompts: convolution + max pooling (worked) and training deep nets (explain).
export default [
  {
    id: 'wr-06-01',
    week: 6,
    topic: 'w6-cnn',
    kind: 'worked',
    marks: 5,
    prompt: `CONVOLUTION AND MAX POOLING: For the 3 × 3 input below, (a) compute the 2 × 2 output of the 2 × 2 convolution kernel with stride 1 and no zero padding (slide the kernel over the input without flipping it, as in the lecture example), and (b) compute the output of 2 × 2 max pooling on the same input, again with stride 1 and no padding. Show every window. (c) State one way in which max pooling differs from the convolution. (5 marks)<br>Input: <table class="mini"><tr><td>2</td><td>1</td><td>3</td></tr><tr><td>0</td><td>4</td><td>1</td></tr><tr><td>5</td><td>2</td><td>6</td></tr></table>Kernel: <table class="mini"><tr><td>1</td><td>−1</td></tr><tr><td>2</td><td>0</td></tr></table>`,
    points: [
      { m: 0.5, text: `Top-left window [[2, 1], [0, 4]]: 2·1 + 1·(−1) + 0·2 + 4·0 = 2 − 1 + 0 + 0 = 1.` },
      { m: 0.5, text: `Top-right window [[1, 3], [4, 1]]: 1·1 + 3·(−1) + 4·2 + 1·0 = 1 − 3 + 8 + 0 = 6.` },
      { m: 0.5, text: `Bottom-left window [[0, 4], [5, 2]]: 0·1 + 4·(−1) + 5·2 + 2·0 = 0 − 4 + 10 + 0 = 6.` },
      { m: 0.5, text: `Bottom-right window [[4, 1], [2, 6]]: 4·1 + 1·(−1) + 2·2 + 6·0 = 4 − 1 + 4 + 0 = 7.` },
      { m: 0.5, text: `Convolution output [[1, 6], [6, 7]]: 2 × 2, smaller than the input because there is no zero padding.` },
      { m: 2, text: `Max pooling, the maximum of each 2 × 2 window (0.5 each): max(2, 1, 0, 4) = 4; max(1, 3, 4, 1) = 4; max(0, 4, 5, 2) = 5; max(4, 1, 2, 6) = 6 → [[4, 4], [5, 6]].` },
      { m: 0.5, text: `(c) Any one difference: convolution is a linear weighted sum with learned weights; max pooling has no weights, is non-linear, is usually used for shrinking the representation and is invariant to small translations.` },
    ],
    model: `(a) Slide the kernel [[1, −1], [2, 0]] over each 2 × 2 window, multiply element-wise and add:<br>top-left [[2, 1], [0, 4]]: 2·1 + 1·(−1) + 0·2 + 4·0 = 2 − 1 + 0 + 0 = <b>1</b><br>top-right [[1, 3], [4, 1]]: 1·1 + 3·(−1) + 4·2 + 1·0 = 1 − 3 + 8 + 0 = <b>6</b><br>bottom-left [[0, 4], [5, 2]]: 0·1 + 4·(−1) + 5·2 + 2·0 = 0 − 4 + 10 + 0 = <b>6</b><br>bottom-right [[4, 1], [2, 6]]: 4·1 + 1·(−1) + 2·2 + 6·0 = 4 − 1 + 4 + 0 = <b>7</b><br>Output: [[1, 6], [6, 7]]; it is 2 × 2 (smaller than the input) because no zero padding is used.<br>(b) Max pooling takes the largest value of each 2 × 2 window:<br>max(2, 1, 0, 4) = <b>4</b>; max(1, 3, 4, 1) = <b>4</b>; max(0, 4, 5, 2) = <b>5</b>; max(4, 1, 2, 6) = <b>6</b><br>Output: [[4, 4], [5, 6]].<br>(c) Unlike the convolution (a linear weighted sum), max pooling has no weights, is non-linear and is used to shrink the representation; it is invariant to small translations (the 4 in the centre wins two windows).`,
    src: 'W6b s18-21, s26-28',
  },
  {
    id: 'wr-06-02',
    week: 6,
    topic: 'w6-dnn',
    kind: 'explain',
    marks: 5,
    prompt: `TRAINING DEEP NETWORKS: Deep neural networks can suffer from vanishing gradients, too little labelled data, slow training and overfitting. Explain the vanishing-gradient problem, and what each of the following addresses and how it works: batch normalisation, the Adam optimiser, dropout and transfer learning. (5 marks)`,
    points: [
      { m: 1, text: `Vanishing gradients: in a deep net the gradients become (almost) zero by the time they reach the lower layers, e.g. because a saturated sigmoid (near 0 or 1) has a derivative ≈ 0; a zero gradient stops learning (the opposite of exploding gradients).` },
      { m: 1, text: `Batch normalisation: like an incremental, trainable StandardScaler inside the network; it rescales each layer's inputs during training, which counters vanishing/exploding gradients and speeds up training.` },
      { m: 1, text: `Adam: a faster optimiser than plain SGD (against slow training); adaptive moment estimation combining momentum (escape local minima, cross plateaus) with RMSProp (adaptive learning rate per parameter); the recommended first choice.` },
      { m: 1, text: `Dropout: regularisation against overfitting; during training, for each mini-batch, some units are ignored at random (e.g. rate 0.2), so the network cannot rely on particular units.` },
      { m: 1, text: `Transfer learning: against too little labelled data; reuse the lower layers of a network trained on a similar task, freeze them and train a new top, then unfreeze and fine-tune with a low learning rate (so the new layer's large early errors do not damage the reused weights).` },
    ],
    model: `<b>Vanishing gradients:</b> during backpropagation the gradients can shrink towards zero on their way down to the lower layers, e.g. with sigmoid activations, which saturate near 0 and 1 where the derivative is almost 0. A zero gradient means those layers stop learning (the opposite problem is exploding gradients).<br><b>Batch normalisation</b> acts like an incremental, trainable StandardScaler inside the network: it normalises the inputs of each layer during training, which keeps gradients in a healthy range and speeds up training.<br><b>Adam</b> addresses slow training: it is an optimiser that combines momentum (keeps moving through plateaus and out of local minima) with RMSProp (an adaptive learning rate for each parameter), and is the recommended first choice instead of plain SGD.<br><b>Dropout</b> addresses overfitting: during training, for each mini-batch, some units are ignored at random (e.g. Dropout(rate=0.2)), so the network cannot rely on particular units; it is a regularisation method.<br><b>Transfer learning</b> addresses too little labelled data: reuse the lower layers of a network trained on lots of data for a similar task, freeze them (layer.trainable = False) and train new top layers, then unfreeze and fine-tune everything with a low learning rate, so the large early errors of the new layer do not destroy the good copied weights.`,
    src: 'W6b s2-15',
  },
];
