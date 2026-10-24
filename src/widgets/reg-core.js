import ConvPool from './ConvPool.jsx';

// Registry entries: { id, title, week, topic, blurb, C, props?, tool? }
// tool: true also lists it on the Tools page (calculators you'd use to check hand working).
export default [
  {
    id: 'conv-pool',
    title: 'Convolution & max pooling',
    week: 6,
    topic: 'w6-cnn',
    blurb: 'Compute a 2×2 convolution and a 2×2 max-pool by hand, window by window.',
    C: ConvPool,
    tool: true,
  },
];
