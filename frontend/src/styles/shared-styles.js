/**
 * Shared Bulma-based styles available to all Lit components.
 * Import into any component:  static styles = [sharedStyles, css`...`]
 */
import { css } from 'lit'

export const sharedStyles = css`
  /* ---------- Reset & typography ---------- */
  :host {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #363636;
    box-sizing: border-box;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  /* ---------- Bulma-compatible utilities ---------- */
  .container { width: 100%; max-width: 1152px; margin: 0 auto; padding: 0 1.5rem; }
  .section   { padding: 3rem 1.5rem; }
  .columns   { display: flex; flex-wrap: wrap; margin: -0.75rem; }
  .column    { flex: 1; padding: 0.75rem; }

  /* ---------- Buttons ---------- */
  .button {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.5em 1em; border: 1px solid #dbdbdb; border-radius: 4px;
    font-size: 1rem; cursor: pointer; background: #fff;
    transition: background 0.15s, border-color 0.15s;
  }
  .button:hover { border-color: #b5b5b5; }
  .button.is-primary   { background: #00d1b2; border-color: transparent; color: #fff; }
  .button.is-primary:hover { background: #00c4a7; }
  .button.is-danger    { background: #f14668; border-color: transparent; color: #fff; }
  .button.is-info      { background: #3e8ed0; border-color: transparent; color: #fff; }
  .button.is-loading::after {
    content: ''; display: inline-block; width: 1em; height: 1em;
    border: 2px solid #dbdbdb; border-right-color: transparent;
    border-radius: 50%; animation: spin 0.5s linear infinite; margin-left: 0.5em;
  }

  /* ---------- Cards ---------- */
  .card {
    background: #fff; border-radius: 6px;
    box-shadow: 0 0.5em 1em -0.125em rgba(10,10,10,.1),
                0 0 0 1px rgba(10,10,10,.02);
  }
  .card-content { padding: 1.5rem; }
  .card-footer  { border-top: 1px solid #ededed; display: flex; }
  .card-footer-item { flex: 1; padding: 0.75rem; text-align: center; }

  /* ---------- Table ---------- */
  .table {
    width: 100%; border-collapse: collapse; border-spacing: 0;
    background: #fff; font-size: 0.95rem;
  }
  .table th, .table td { border: 1px solid #dbdbdb; padding: 0.5em 0.75em; vertical-align: top; }
  .table th { background: #f5f5f5; font-weight: 600; text-align: left; }
  .table tr:hover { background: #fafafa; }

  /* ---------- Tags ---------- */
  .tag {
    display: inline-flex; align-items: center; padding: 0 0.75em;
    height: 2em; border-radius: 4px; font-size: 0.75rem; font-weight: 600;
  }
  .tag.is-success { background: #48c78e; color: #fff; }
  .tag.is-warning { background: #ffe08a; color: rgba(0,0,0,.7); }
  .tag.is-danger  { background: #f14668; color: #fff; }
  .tag.is-info    { background: #3e8ed0; color: #fff; }

  /* ---------- Notification ---------- */
  .notification {
    padding: 1.25rem 2.5rem 1.25rem 1.5rem;
    border-radius: 4px; position: relative;
  }
  .notification.is-info    { background: #eff5fb; color: #296fa8; }
  .notification.is-success { background: #effaf5; color: #257953; }
  .notification.is-warning { background: #fffaeb; color: #946c00; }
  .notification.is-danger  { background: #feecf0; color: #cc0f35; }

  /* ---------- Form ---------- */
  .input, .select select, .textarea {
    padding: 0.5em 0.75em; border: 1px solid #dbdbdb; border-radius: 4px;
    font-size: 1rem; max-width: 100%;
  }
  .input:focus, .textarea:focus { border-color: #3e8ed0; outline: none; box-shadow: 0 0 0 0.125em rgba(62,142,208,.25); }
  .label { display: block; font-weight: 600; margin-bottom: 0.5em; }

  /* ---------- Helpers ---------- */
  .has-text-centered { text-align: center; }
  .has-text-weight-bold { font-weight: 700; }
  .mt-2 { margin-top: 0.5rem; }  .mt-4 { margin-top: 1rem; }
  .mb-2 { margin-bottom: 0.5rem; } .mb-4 { margin-bottom: 1rem; }
  .mr-2 { margin-right: 0.5rem; }

  /* ---------- Animation ---------- */
  @keyframes spin { to { transform: rotate(360deg); } }
`
