/* global React, ReactDOM, StorybookRepertoire, StorybookTraining, StorybookMobile */

function StorybookVariantApp() {
  return (
    <main style={{
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 40,
      alignItems: 'center',
    }}>
      <header style={{
        width: 'min(1440px, 100%)',
        boxSizing: 'border-box',
        padding: '20px 24px',
        background: '#FFFDF7',
        border: '2px solid #2A1B4A',
        borderRadius: 18,
        boxShadow: '0 4px 0 #D9C8AA',
      }}>
        <div style={{
          font: '700 12px/1 "JetBrains Mono", monospace',
          letterSpacing: '.16em',
          color: '#8B6FE8',
          marginBottom: 8,
        }}>
          02 — VARIANT A
        </div>
        <h1 style={{
          font: '800 34px/1 "Fraunces", serif',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Storybook
        </h1>
        <p style={{
          maxWidth: 760,
          margin: '10px 0 0',
          color: '#5B4A7A',
          font: '500 15px/1.5 "Plus Jakarta Sans", sans-serif',
        }}>
          Variante visual calida y editorial para ChessEngineered: repertorio, entrenamiento y frames mobile.
        </p>
      </header>

      <PreviewFrame label="Repertoire · desktop">
        <StorybookRepertoire />
      </PreviewFrame>

      <PreviewFrame label="Training · desktop">
        <StorybookTraining />
      </PreviewFrame>

      <PreviewFrame label="Mobile · repertoire + training" width={880}>
        <StorybookMobile />
      </PreviewFrame>
    </main>
  );
}

function PreviewFrame({ label, children, width = 1440 }) {
  return (
    <section style={{ width: '100%', overflowX: 'auto', paddingBottom: 12 }}>
      <div style={{
        width,
        margin: '0 auto 12px',
        font: '800 12px/1 "JetBrains Mono", monospace',
        letterSpacing: '.14em',
        color: '#5B4A7A',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        width,
        margin: '0 auto',
        background: '#FBF7F0',
        boxShadow: '0 24px 80px rgba(42, 27, 74, .18)',
      }}>
        {children}
      </div>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StorybookVariantApp />);
