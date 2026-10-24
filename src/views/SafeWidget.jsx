// Renders a widget inside its own error boundary so one broken visual can't take down a page.
import { Component } from 'preact';

export class SafeWidget extends Component {
  state = { err: null };
  componentDidCatch(err) {
    console.error('widget error', this.props.w && this.props.w.id, err);
    this.setState({ err });
  }
  render() {
    const { w, props } = this.props;
    if (this.state.err)
      return (
        <div class="card fb hint">
          <span class="mark">!</span>
          <div>
            The “{w.title}” visual hit an error and was switched off. Everything else on the page still works.
          </div>
        </div>
      );
    const C = w.C;
    return <C {...(props || w.props || {})} />;
  }
}
