import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Lang = 'en' | 'pl' | 'fr' | 'de' | 'es';

export const LANGUAGES: { id: Lang; flag: string; label: string }[] = [
  { id: 'en', flag: '🇬🇧', label: 'English' },
  { id: 'pl', flag: '🇵🇱', label: 'Polski' },
  { id: 'fr', flag: '🇫🇷', label: 'Français' },
  { id: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { id: 'es', flag: '🇪🇸', label: 'Español' },
];

/* ========== Translation strings ========== */

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Map context menu
    changeBackground: 'Change background',
    downloadMap: 'Download map',
    downloading: 'Downloading...',
    addLocation: 'Add location',
    // Location context menu
    changeImage: 'Change image',
    connectTo: 'Connect to...',
    markers: 'Markers',
    deleteLocation: 'Delete location',
    // Path context menu
    changeColor: 'Change color',
    deleteConnection: 'Delete connection',
    pathColor: 'Path color',
    // Marker types
    markerObjective: 'Objectives',
    markerBoldness: 'Boldness',
    markerSurvival: 'Survival',
    markerAltruism: 'Altruism',
    // Path colors
    pathRed: 'Red',
    pathGreen: 'Green',
    pathBlue: 'Blue',
    pathYellow: 'Yellow (→)',
    // Status bar
    connectMode: 'Connect mode — click target location (Esc to cancel)',
    rightClickHint: 'Right-click to open menu',
    // Map placeholder
    mapPlaceholder: 'Right-click to set background',
    // New location
    newLocation: 'Location',
    // Export error
    exportError: 'Export failed. Please try again.',
    // Validation
    validationError: 'Cannot download map',
    validationMissingSpawns: 'Missing spawn points:',
    validationMissingMarkers: 'Missing markers:',
    validationNoConnections: 'Locations without connections:',
    validationMissingDoors: 'Missing doors:',
    validationClose: 'Close',
    // Door
    door: 'Door',
    doorOn: 'ON',
    doorOff: 'OFF',
    doorMaxReached: 'Maximum 4 doors reached',
  },
  pl: {
    changeBackground: 'Zmień tło',
    downloadMap: 'Pobierz mapę',
    downloading: 'Pobieranie...',
    addLocation: 'Dodaj lokalizację',
    changeImage: 'Zmień zdjęcie',
    connectTo: 'Połącz z...',
    markers: 'Znaczniki',
    deleteLocation: 'Usuń lokalizację',
    changeColor: 'Zmień kolor',
    deleteConnection: 'Usuń połączenie',
    pathColor: 'Kolor trasy',
    markerObjective: 'Cele',
    markerBoldness: 'Odwaga',
    markerSurvival: 'Przetrwanie',
    markerAltruism: 'Altruizm',
    pathRed: 'Czerwony',
    pathGreen: 'Zielony',
    pathBlue: 'Niebieski',
    pathYellow: 'Żółty (→)',
    connectMode: 'Tryb łączenia — kliknij lokalizację docelową (Esc aby anulować)',
    rightClickHint: 'Prawy przycisk myszy aby otworzyć menu',
    mapPlaceholder: 'Kliknij prawym przyciskiem myszy, aby dodać tło',
    newLocation: 'Lokalizacja',
    exportError: 'Eksport nie powiódł się. Spróbuj ponownie.',
    validationError: 'Nie można pobrać mapy',
    validationMissingSpawns: 'Brakujące punkty spawnu:',
    validationMissingMarkers: 'Brakujące znaczniki:',
    validationNoConnections: 'Lokalizacje bez połączeń:',
    validationMissingDoors: 'Brakujące drzwi:',
    validationClose: 'Zamknij',
    door: 'Drzwi',
    doorOn: 'WŁ',
    doorOff: 'WYŁ',
    doorMaxReached: 'Osiągnięto maksimum 4 drzwi',
  },
  fr: {
    changeBackground: "Changer l'arrière-plan",
    downloadMap: 'Télécharger la carte',
    downloading: 'Téléchargement...',
    addLocation: 'Ajouter un lieu',
    changeImage: "Changer l'image",
    connectTo: 'Connecter à...',
    markers: 'Marqueurs',
    deleteLocation: 'Supprimer le lieu',
    changeColor: 'Changer la couleur',
    deleteConnection: 'Supprimer la connexion',
    pathColor: 'Couleur du chemin',
    markerObjective: 'Objectifs',
    markerBoldness: 'Audace',
    markerSurvival: 'Survie',
    markerAltruism: 'Altruisme',
    pathRed: 'Rouge',
    pathGreen: 'Vert',
    pathBlue: 'Bleu',
    pathYellow: 'Jaune (→)',
    connectMode: 'Mode connexion — cliquez sur la destination (Échap pour annuler)',
    rightClickHint: 'Clic droit pour ouvrir le menu',
    mapPlaceholder: "Clic droit pour définir l'arrière-plan",
    newLocation: 'Lieu',
    exportError: "L'exportation a échoué. Veuillez réessayer.",
    validationError: 'Impossible de télécharger la carte',
    validationMissingSpawns: 'Points de spawn manquants:',
    validationMissingMarkers: 'Marqueurs manquants:',
    validationNoConnections: 'Lieux sans connexions:',
    validationMissingDoors: 'Portes manquantes:',
    validationClose: 'Fermer',
    door: 'Porte',
    doorOn: 'ON',
    doorOff: 'OFF',
    doorMaxReached: 'Maximum 4 portes atteint',
  },
  de: {
    changeBackground: 'Hintergrund ändern',
    downloadMap: 'Karte herunterladen',
    downloading: 'Herunterladen...',
    addLocation: 'Ort hinzufügen',
    changeImage: 'Bild ändern',
    connectTo: 'Verbinden mit...',
    markers: 'Markierungen',
    deleteLocation: 'Ort löschen',
    changeColor: 'Farbe ändern',
    deleteConnection: 'Verbindung löschen',
    pathColor: 'Pfadfarbe',
    markerObjective: 'Ziele',
    markerBoldness: 'Kühnheit',
    markerSurvival: 'Überleben',
    markerAltruism: 'Altruismus',
    pathRed: 'Rot',
    pathGreen: 'Grün',
    pathBlue: 'Blau',
    pathYellow: 'Gelb (→)',
    connectMode: 'Verbindungsmodus — Klicken Sie auf das Ziel (Esc zum Abbrechen)',
    rightClickHint: 'Rechtsklick zum Öffnen des Menüs',
    mapPlaceholder: 'Rechtsklick um Hintergrund festzulegen',
    newLocation: 'Ort',
    exportError: 'Export fehlgeschlagen. Bitte versuchen Sie es erneut.',
    validationError: 'Karte kann nicht heruntergeladen werden',
    validationMissingSpawns: 'Fehlende Spawn-Punkte:',
    validationMissingMarkers: 'Fehlende Markierungen:',
    validationNoConnections: 'Orte ohne Verbindungen:',
    validationMissingDoors: 'Fehlende Türen:',
    validationClose: 'Schließen',
    door: 'Tür',
    doorOn: 'AN',
    doorOff: 'AUS',
    doorMaxReached: 'Maximal 4 Türen erreicht',
  },
  es: {
    changeBackground: 'Cambiar fondo',
    downloadMap: 'Descargar mapa',
    downloading: 'Descargando...',
    addLocation: 'Añadir ubicación',
    changeImage: 'Cambiar imagen',
    connectTo: 'Conectar con...',
    markers: 'Marcadores',
    deleteLocation: 'Eliminar ubicación',
    changeColor: 'Cambiar color',
    deleteConnection: 'Eliminar conexión',
    pathColor: 'Color de ruta',
    markerObjective: 'Objetivos',
    markerBoldness: 'Audacia',
    markerSurvival: 'Supervivencia',
    markerAltruism: 'Altruismo',
    pathRed: 'Rojo',
    pathGreen: 'Verde',
    pathBlue: 'Azul',
    pathYellow: 'Amarillo (→)',
    connectMode: 'Modo conexión — haz clic en la ubicación destino (Esc para cancelar)',
    rightClickHint: 'Clic derecho para abrir el menú',
    mapPlaceholder: 'Clic derecho para establecer el fondo',
    newLocation: 'Ubicación',
    exportError: 'La exportación falló. Inténtalo de nuevo.',
    validationError: 'No se puede descargar el mapa',
    validationMissingSpawns: 'Puntos de aparición faltantes:',
    validationMissingMarkers: 'Marcadores faltantes:',
    validationNoConnections: 'Ubicaciones sin conexiones:',
    validationMissingDoors: 'Puertas faltantes:',
    validationClose: 'Cerrar',
    door: 'Puerta',
    doorOn: 'SÍ',
    doorOff: 'NO',
    doorMaxReached: 'Máximo 4 puertas alcanzado',
  },
};

/* ========== Marker / Path label helpers ========== */

export type MarkerType = 'objective' | 'boldness' | 'survival' | 'altruism';
export type PathColor = 'red' | 'green' | 'blue' | 'yellow';

const MARKER_KEYS: Record<MarkerType, string> = {
  objective: 'markerObjective',
  boldness: 'markerBoldness',
  survival: 'markerSurvival',
  altruism: 'markerAltruism',
};

const PATH_KEYS: Record<PathColor, string> = {
  red: 'pathRed',
  green: 'pathGreen',
  blue: 'pathBlue',
  yellow: 'pathYellow',
};

/* ========== Context ========== */

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Record<string, string>;
  markerLabel: (type: MarkerType) => string;
  pathLabel: (color: PathColor) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
  markerLabel: (type) => translations.en[MARKER_KEYS[type]],
  pathLabel: (color) => translations.en[PATH_KEYS[color]],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = translations[lang];

  const markerLabel = useCallback(
    (type: MarkerType) => translations[lang][MARKER_KEYS[type]],
    [lang]
  );

  const pathLabel = useCallback(
    (color: PathColor) => translations[lang][PATH_KEYS[color]],
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, markerLabel, pathLabel }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
