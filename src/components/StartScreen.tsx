import { useI18n, LANGUAGES } from '../i18n';

interface StartScreenProps {
  onLoadExample: () => void;
  onImport: () => void;
  onStartFresh: () => void;
}

export function StartScreen({ onLoadExample, onImport, onStartFresh }: StartScreenProps) {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="start-title">DBD Board Game</h1>
        <p className="start-subtitle">{t.startSubtitle}</p>

        <div className="start-description">
          <p>{t.startDescription}</p>
        </div>

        <div className="start-instructions">
          <h3>{t.sidebarHowToUse}</h3>
          <ul>
            <li>{t.sidebarInstructionDragRooms}</li>
            <li>{t.sidebarInstructionDragPaths}</li>
            <li>{t.sidebarInstructionDragJoins}</li>
            <li>{t.sidebarInstructionRightClickRoom}</li>
            <li>{t.sidebarInstructionRightClickPath}</li>
            <li>{t.sidebarInstructionClickName}</li>
          </ul>
        </div>

        <div className="start-buttons">
          <button className="start-btn start-btn-primary" onClick={onLoadExample}>
            {t.startLoadExample}
          </button>
          <button className="start-btn start-btn-secondary" onClick={onImport}>
            {t.startImportFile}
          </button>
          <button className="start-btn start-btn-ghost" onClick={onStartFresh}>
            {t.startFresh}
          </button>
        </div>

        <div className="start-lang">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              className={`start-lang-btn${lang === l.id ? ' start-lang-active' : ''}`}
              title={l.label}
              onClick={() => setLang(l.id)}
            >
              {l.flag}
            </button>
          ))}
        </div>

        <p className="start-credits">
          {t.startCredits}
        </p>
      </div>
    </div>
  );
}
