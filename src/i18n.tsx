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
    // Game board context menu
    changeBackground: 'Change background',
    downloadGameBoard: 'Download game board',
    downloading: 'Downloading...',
    addRoom: 'Add room',
    // Room context menu
    changeImage: 'Change image',
    connectTo: 'Connect to...',
    propTiles: 'Prop Tiles',
    deleteRoom: 'Delete room',
    roomSizeSmall: 'Small Room',
    roomSizeLarge: 'Large Room',
    // Path context menu
    changeColor: 'Change color',
    deletePath: 'Delete path',
    pathType: 'Path type',
    // Prop tile types
    propTileObjective: 'Objectives',
    propTileBoldness: 'Boldness',
    propTileSurvival: 'Survival',
    propTileAltruism: 'Altruism',
    // Path types (movement)
    pathSneak: 'Sneak (blue)',
    pathSprint: 'Sprint (green)',
    pathCrouch: 'Crouch (red)',
    pathVault: 'Vault (yellow →)',
    // Status bar
    connectMode: 'Connect mode — click target room (Esc to cancel)',
    rightClickHint: 'Right-click to open menu',
    // Game board placeholder
    gameBoardPlaceholder: 'Right-click to set background',
    // New room
    newRoom: 'Room',
    // Export error
    exportError: 'Export failed. Please try again.',
    // Validation
    validationError: 'Cannot download game board',
    validationMissingInitialPlacements: 'Missing initial placements:',
    validationMissingInitialPlacementsDesc: 'The game requires exactly 6 rooms with initial placements (0-5). Players roll a dice at the start to determine which room their character begins in.',
    validationMissingPropTiles: 'Missing prop tiles:',
    validationMissingPropTilesDesc: 'The game board must contain all prop tiles for balanced gameplay: 10 Objectives, 10 Boldness, 12 Survival, and 12 Altruism tiles distributed across rooms.',
    validationNoConnections: 'Rooms without paths:',
    validationNoConnectionsDesc: 'Every room must have at least one path connection so players can enter and exit. Rooms cannot be isolated.',
    validationMissingBreakableWalls: 'Missing breakable walls:',
    validationMissingBreakableWallsDesc: 'The game requires exactly 4 breakable walls placed on paths. These special walls can be destroyed during gameplay.',
    validationDeadEndRooms: 'Rooms with only one-way exits:',
    validationDeadEndRoomsDesc: 'These rooms only have yellow (vault) paths leading out, which are one-way. Players entering these rooms would be trapped with no way to leave.',
    validationClose: 'Close',
    success: 'Success',
    ok: 'OK',
    exportSuccess: 'Game board exported successfully!',
    downloadSuccess: 'Game board image downloaded successfully!',
    // Breakable Wall
    breakableWall: 'Breakable Wall',
    breakableWallOn: 'ON',
    breakableWallOff: 'OFF',
    // Import/Export
    exportGameBoard: 'Export game board',
    importGameBoard: 'Import game board',
    clearGameBoard: 'Clear game board',
    exportCopied: 'Game board data copied to clipboard!',
    exportCopyManual: 'Copy this data:',
    importPlaceholder: 'Paste exported game board data here...',
    importError: 'Invalid game board data format',
    cancel: 'Cancel',
    import: 'Import',
    breakableWallMaxReached: 'Maximum 4 breakable walls reached',
  },
  pl: {
    changeBackground: 'Zmień tło',
    downloadGameBoard: 'Pobierz planszę główną',
    downloading: 'Pobieranie...',
    addRoom: 'Dodaj lokację',
    changeImage: 'Zmień zdjęcie',
    connectTo: 'Połącz z...',
    propTiles: 'Elementy',
    deleteRoom: 'Usuń lokację',
    roomSizeSmall: 'Mała lokacja',
    roomSizeLarge: 'Duża lokacja',
    changeColor: 'Zmień kolor',
    deletePath: 'Usuń ścieżkę',
    pathType: 'Karta ruchu',
    propTileObjective: 'Cele',
    propTileBoldness: 'Odwaga',
    propTileSurvival: 'Przetrwanie',
    propTileAltruism: 'Altruizm',
    pathSneak: 'Skradaj się (niebieski)',
    pathSprint: 'Biegnij (zielony)',
    pathCrouch: 'Przykucnij (czerwony)',
    pathVault: 'Przeskocz (żółty →)',
    connectMode: 'Tryb łączenia — kliknij lokację docelową (Esc aby anulować)',
    rightClickHint: 'Prawy przycisk myszy aby otworzyć menu',
    gameBoardPlaceholder: 'Kliknij prawym przyciskiem myszy, aby dodać tło',
    newRoom: 'Lokacja',
    exportError: 'Eksport nie powiódł się. Spróbuj ponownie.',
    validationError: 'Nie można pobrać planszy głównej',
    validationMissingInitialPlacements: 'Brakujące początkowe pozycje:',
    validationMissingInitialPlacementsDesc: 'Gra wymaga dokładnie 6 lokacji z pozycjami startowymi (0-5). Gracze rzucają kością na początku, aby określić, w której lokacji rozpoczyna ich postać.',
    validationMissingPropTiles: 'Brakujące elementy:',
    validationMissingPropTilesDesc: 'Plansza musi zawierać wszystkie elementy dla zbalansowanej rozgrywki: 10 Celów, 10 Odwagi, 12 Przetrwania i 12 Altruizmu rozmieszczonych w lokacjach.',
    validationNoConnections: 'Lokacje bez ścieżek:',
    validationNoConnectionsDesc: 'Każda lokacja musi mieć co najmniej jedno połączenie ścieżką, aby gracze mogli wchodzić i wychodzić. Lokacje nie mogą być izolowane.',
    validationMissingBreakableWalls: 'Brakujące nadkruszone ściany:',
    validationMissingBreakableWallsDesc: 'Gra wymaga dokładnie 4 nadkruszonych ścian umieszczonych na ścieżkach. Te specjalne ściany mogą zostać zniszczone podczas rozgrywki.',
    validationDeadEndRooms: 'Lokacje tylko z jednokierunkowymi wyjściami:',
    validationDeadEndRoomsDesc: 'Te lokacje mają tylko żółte ścieżki (przeskocz) prowadzące na zewnątrz, które są jednokierunkowe. Gracze wchodzący do tych lokacji byliby uwięzieni bez możliwości wyjścia.',
    validationClose: 'Zamknij',
    success: 'Sukces',
    ok: 'OK',
    exportSuccess: 'Plansza główna została wyeksportowana!',
    downloadSuccess: 'Obrazek planszy głównej został pobrany!',
    breakableWall: 'Nadkruszona ściana',
    breakableWallOn: 'WŁ',
    breakableWallOff: 'WYŁ',
    breakableWallMaxReached: 'Osiągnięto maksimum 4 nadkruszonych ścian',
    exportGameBoard: 'Eksportuj planszę główną',
    importGameBoard: 'Importuj planszę główną',
    clearGameBoard: 'Wyczyść planszę główną',
    exportCopied: 'Dane planszy głównej skopiowane!',
    exportCopyManual: 'Skopiuj te dane:',
    importPlaceholder: 'Wklej tutaj dane planszy głównej...',
    importError: 'Nieprawidłowy format danych',
    cancel: 'Anuluj',
    import: 'Importuj',
  },
  fr: {
    changeBackground: "Changer l'arrière-plan",
    downloadGameBoard: 'Télécharger le plateau',
    downloading: 'Téléchargement...',
    addRoom: 'Ajouter une salle',
    changeImage: "Changer l'image",
    connectTo: 'Connecter à...',
    propTiles: 'Tuiles de propriété',
    deleteRoom: 'Supprimer la salle',
    roomSizeSmall: 'Petite salle',
    roomSizeLarge: 'Grande salle',
    changeColor: 'Changer la couleur',
    deletePath: 'Supprimer le chemin',
    pathType: 'Type de chemin',
    propTileObjective: 'Objectifs',
    propTileBoldness: 'Audace',
    propTileSurvival: 'Survie',
    propTileAltruism: 'Altruisme',
    pathSneak: 'Furtif (bleu)',
    pathSprint: 'Sprint (vert)',
    pathCrouch: 'Accroupi (rouge)',
    pathVault: 'Saut (jaune →)',
    connectMode: 'Mode connexion — cliquez sur la salle cible (Échap pour annuler)',
    rightClickHint: 'Clic droit pour ouvrir le menu',
    gameBoardPlaceholder: "Clic droit pour définir l'arrière-plan",
    newRoom: 'Salle',
    exportError: "L'exportation a échoué. Veuillez réessayer.",
    validationError: 'Impossible de télécharger le plateau',
    validationMissingInitialPlacements: 'Placements initiaux manquants:',
    validationMissingInitialPlacementsDesc: 'Le jeu nécessite exactement 6 salles avec des placements initiaux (0-5). Les joueurs lancent un dé au début pour déterminer dans quelle salle leur personnage commence.',
    validationMissingPropTiles: 'Tuiles de propriété manquantes:',
    validationMissingPropTilesDesc: 'Le plateau doit contenir toutes les tuiles pour un gameplay équilibré: 10 Objectifs, 10 Audace, 12 Survie et 12 Altruisme répartis dans les salles.',
    validationNoConnections: 'Salles sans chemins:',
    validationNoConnectionsDesc: 'Chaque salle doit avoir au moins une connexion de chemin pour que les joueurs puissent entrer et sortir. Les salles ne peuvent pas être isolées.',
    validationMissingBreakableWalls: 'Murs cassables manquants:',
    validationMissingBreakableWallsDesc: 'Le jeu nécessite exactement 4 murs cassables placés sur les chemins. Ces murs spéciaux peuvent être détruits pendant le jeu.',
    validationDeadEndRooms: 'Salles avec sorties unidirectionnelles uniquement:',
    validationDeadEndRoomsDesc: 'Ces salles n\'ont que des chemins jaunes (saut) menant vers l\'extérieur, qui sont à sens unique. Les joueurs entrant dans ces salles seraient piégés sans moyen de sortir.',
    validationClose: 'Fermer',
    success: 'Succès',
    ok: 'OK',
    exportSuccess: 'Plateau de jeu exporté avec succès!',
    downloadSuccess: 'Image du plateau téléchargée avec succès!',
    breakableWall: 'Mur cassable',
    breakableWallOn: 'OUI',
    breakableWallOff: 'NON',
    breakableWallMaxReached: 'Maximum 4 murs cassables atteint',
    exportGameBoard: 'Exporter le plateau',
    importGameBoard: 'Importer le plateau',
    clearGameBoard: 'Effacer le plateau',
    exportCopied: 'Données du plateau copiées!',
    exportCopyManual: 'Copiez ces données:',
    importPlaceholder: 'Collez les données du plateau ici...',
    importError: 'Format de données invalide',
    cancel: 'Annuler',
    import: 'Importer',
  },
  de: {
    changeBackground: 'Hintergrund ändern',
    downloadGameBoard: 'Spielbrett herunterladen',
    downloading: 'Herunterladen...',
    addRoom: 'Raum hinzufügen',
    changeImage: 'Bild ändern',
    connectTo: 'Verbinden mit...',
    propTiles: 'Eigenschaftskacheln',
    deleteRoom: 'Raum löschen',
    roomSizeSmall: 'Kleiner Raum',
    roomSizeLarge: 'Großer Raum',
    changeColor: 'Farbe ändern',
    deletePath: 'Pfad löschen',
    pathType: 'Pfadtyp',
    propTileObjective: 'Ziele',
    propTileBoldness: 'Kühnheit',
    propTileSurvival: 'Überleben',
    propTileAltruism: 'Altruismus',
    pathSneak: 'Schleichen (blau)',
    pathSprint: 'Sprint (grün)',
    pathCrouch: 'Ducken (rot)',
    pathVault: 'Springen (gelb →)',
    connectMode: 'Verbindungsmodus — Klicken Sie auf den Zielraum (Esc zum Abbrechen)',
    rightClickHint: 'Rechtsklick zum Öffnen des Menüs',
    gameBoardPlaceholder: 'Rechtsklick um Hintergrund festzulegen',
    newRoom: 'Raum',
    exportError: 'Export fehlgeschlagen. Bitte versuchen Sie es erneut.',
    validationError: 'Spielbrett kann nicht heruntergeladen werden',
    validationMissingInitialPlacements: 'Fehlende Anfangsplatzierungen:',
    validationMissingInitialPlacementsDesc: 'Das Spiel erfordert genau 6 Räume mit Anfangsplatzierungen (0-5). Die Spieler würfeln zu Beginn, um zu bestimmen, in welchem Raum ihre Figur startet.',
    validationMissingPropTiles: 'Fehlende Eigenschaftskacheln:',
    validationMissingPropTilesDesc: 'Das Spielbrett muss alle Eigenschaftskacheln für ausgewogenes Gameplay enthalten: 10 Ziele, 10 Kühnheit, 12 Überleben und 12 Altruismus verteilt auf die Räume.',
    validationNoConnections: 'Räume ohne Pfade:',
    validationNoConnectionsDesc: 'Jeder Raum muss mindestens eine Pfadverbindung haben, damit Spieler ein- und ausgehen können. Räume dürfen nicht isoliert sein.',
    validationMissingBreakableWalls: 'Fehlende zerbrechliche Wände:',
    validationMissingBreakableWallsDesc: 'Das Spiel erfordert genau 4 zerbrechliche Wände auf Pfaden. Diese speziellen Wände können während des Spiels zerstört werden.',
    validationDeadEndRooms: 'Räume mit nur Einweg-Ausgängen:',
    validationDeadEndRoomsDesc: 'Diese Räume haben nur gelbe (Sprung) Pfade, die nach außen führen, welche Einwegpfade sind. Spieler, die diese Räume betreten, wären ohne Ausweg gefangen.',
    validationClose: 'Schließen',
    success: 'Erfolg',
    ok: 'OK',
    exportSuccess: 'Spielbrett erfolgreich exportiert!',
    downloadSuccess: 'Spielbrett-Bild erfolgreich heruntergeladen!',
    breakableWall: 'Zerbrechliche Wand',
    breakableWallOn: 'AN',
    breakableWallOff: 'AUS',
    breakableWallMaxReached: 'Maximal 4 zerbrechliche Wände erreicht',
    exportGameBoard: 'Spielbrett exportieren',
    importGameBoard: 'Spielbrett importieren',
    clearGameBoard: 'Spielbrett leeren',
    exportCopied: 'Spielbrettdaten kopiert!',
    exportCopyManual: 'Kopieren Sie diese Daten:',
    importPlaceholder: 'Spielbrettdaten hier einfügen...',
    importError: 'Ungültiges Datenformat',
    cancel: 'Abbrechen',
    import: 'Importieren',
  },
  es: {
    changeBackground: 'Cambiar fondo',
    downloadGameBoard: 'Descargar tablero',
    downloading: 'Descargando...',
    addRoom: 'Añadir sala',
    changeImage: 'Cambiar imagen',
    connectTo: 'Conectar con...',
    propTiles: 'Losetas de propiedad',
    deleteRoom: 'Eliminar sala',
    roomSizeSmall: 'Sala pequeña',
    roomSizeLarge: 'Sala grande',
    changeColor: 'Cambiar color',
    deletePath: 'Eliminar camino',
    pathType: 'Tipo de camino',
    propTileObjective: 'Objetivos',
    propTileBoldness: 'Audacia',
    propTileSurvival: 'Supervivencia',
    propTileAltruism: 'Altruismo',
    pathSneak: 'Sigilo (azul)',
    pathSprint: 'Sprint (verde)',
    pathCrouch: 'Agacharse (rojo)',
    pathVault: 'Saltar (amarillo →)',
    connectMode: 'Modo conexión — haz clic en la sala destino (Esc para cancelar)',
    rightClickHint: 'Clic derecho para abrir el menú',
    gameBoardPlaceholder: 'Clic derecho para establecer el fondo',
    newRoom: 'Sala',
    exportError: 'La exportación falló. Inténtalo de nuevo.',
    validationError: 'No se puede descargar el tablero',
    validationMissingInitialPlacements: 'Colocaciones iniciales faltantes:',
    validationMissingInitialPlacementsDesc: 'El juego requiere exactamente 6 salas con colocaciones iniciales (0-5). Los jugadores tiran un dado al inicio para determinar en qué sala comienza su personaje.',
    validationMissingPropTiles: 'Losetas de propiedad faltantes:',
    validationMissingPropTilesDesc: 'El tablero debe contener todas las losetas para un juego equilibrado: 10 Objetivos, 10 Audacia, 12 Supervivencia y 12 Altruismo distribuidos en las salas.',
    validationNoConnections: 'Salas sin caminos:',
    validationNoConnectionsDesc: 'Cada sala debe tener al menos una conexión de camino para que los jugadores puedan entrar y salir. Las salas no pueden estar aisladas.',
    validationMissingBreakableWalls: 'Paredes rompibles faltantes:',
    validationMissingBreakableWallsDesc: 'El juego requiere exactamente 4 paredes rompibles colocadas en caminos. Estas paredes especiales pueden ser destruidas durante el juego.',
    validationDeadEndRooms: 'Salas con solo salidas unidireccionales:',
    validationDeadEndRoomsDesc: 'Estas salas solo tienen caminos amarillos (salto) que llevan hacia afuera, que son unidireccionales. Los jugadores que entren en estas salas quedarían atrapados sin forma de salir.',
    validationClose: 'Cerrar',
    success: 'Éxito',
    ok: 'OK',
    exportSuccess: '¡Tablero de juego exportado con éxito!',
    downloadSuccess: '¡Imagen del tablero descargada con éxito!',
    breakableWall: 'Pared rompible',
    breakableWallOn: 'SÍ',
    breakableWallOff: 'NO',
    breakableWallMaxReached: 'Máximo 4 paredes rompibles alcanzado',
    exportGameBoard: 'Exportar tablero',
    importGameBoard: 'Importar tablero',
    clearGameBoard: 'Limpiar tablero',
    exportCopied: '¡Datos del tablero copiados!',
    exportCopyManual: 'Copie estos datos:',
    importPlaceholder: 'Pegue los datos del tablero aquí...',
    importError: 'Formato de datos inválido',
    cancel: 'Cancelar',
    import: 'Importar',
  },
};

/* ========== Prop Tile / Path label helpers ========== */

export type PropTileType = 'objective' | 'boldness' | 'survival' | 'altruism';
export type PathType = 'red' | 'green' | 'blue' | 'yellow';

const PROP_TILE_KEYS: Record<PropTileType, string> = {
  objective: 'propTileObjective',
  boldness: 'propTileBoldness',
  survival: 'propTileSurvival',
  altruism: 'propTileAltruism',
};

const PATH_KEYS: Record<PathType, string> = {
  red: 'pathCrouch',
  green: 'pathSprint',
  blue: 'pathSneak',
  yellow: 'pathVault',
};

/* ========== Context ========== */

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Record<string, string>;
  propTileLabel: (type: PropTileType) => string;
  pathLabel: (color: PathType) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
  propTileLabel: (type) => translations.en[PROP_TILE_KEYS[type]],
  pathLabel: (color) => translations.en[PATH_KEYS[color]],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = translations[lang];

  const propTileLabel = useCallback(
    (type: PropTileType) => translations[lang][PROP_TILE_KEYS[type]],
    [lang]
  );

  const pathLabel = useCallback(
    (color: PathType) => translations[lang][PATH_KEYS[color]],
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, propTileLabel, pathLabel }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
