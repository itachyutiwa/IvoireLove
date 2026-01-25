// Pays africains avec leurs drapeaux
export const AFRICAN_COUNTRIES = [
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'GN', name: 'Guinée', flag: '🇬🇳' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩' },
  { code: 'CF', name: 'RCA', flag: '🇨🇫' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳' },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬' },
  { code: 'ET', name: 'Éthiopie', flag: '🇪🇹' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿' },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'ZM', name: 'Zambie', flag: '🇿🇲' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MU', name: 'Maurice', flag: '🇲🇺' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'CV', name: 'Cap-Vert', flag: '🇨🇻' },
  { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'MR', name: 'Mauritanie', flag: '🇲🇷' },
  { code: 'GM', name: 'Gambie', flag: '🇬🇲' },
  { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶' },
  { code: 'ST', name: 'São Tomé-et-Príncipe', flag: '🇸🇹' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'ER', name: 'Érythrée', flag: '🇪🇷' },
  { code: 'SO', name: 'Somalie', flag: '🇸🇴' },
  { code: 'SD', name: 'Soudan', flag: '🇸🇩' },
  { code: 'SS', name: 'Soudan du Sud', flag: '🇸🇸' },
  { code: 'LY', name: 'Libye', flag: '🇱🇾' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'NA', name: 'Namibie', flag: '🇳🇦' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
];

// Structure hiérarchique des localisations par pays (exemple pour Côte d'Ivoire)
export const LOCATIONS_BY_COUNTRY: Record<string, {
  regions: Record<string, {
    cities: Record<string, {
      communes: string[];
      quartiers: string[];
    }>;
  }>;
}> = {
  'Côte d\'Ivoire': {
    regions: {
      'Lagunes': {
        cities: {
          'Abidjan': {
            communes: ['Cocody', 'Marcory', 'Yopougon', 'Treichville', 'Adjamé', 'Attécoubé', 'Koumassi', 'Port-Bouët', 'Abobo', 'Anyama', 'Bingerville', 'Plateau'],
            quartiers: ['Angré', 'Riviera', 'Marcory Zone 4', 'Yopougon Siporex', 'Treichville Gare', 'Adjamé Gare', 'Attécoubé Banco', 'Koumassi Remblais', 'Port-Bouët Aéroport', 'Abobo Baoulé', 'Anyama Centre', 'Bingerville Centre', 'Plateau Centre-ville'],
          },
          'Grand-Bassam': {
            communes: ['Grand-Bassam-Centre', 'Bingerville', 'Bonoua', 'Jacqueville'],
            quartiers: ['Grand-Bassam Centre', 'Bingerville Centre', 'Bonoua Centre', 'Jacqueville Centre'],
          },
        },
      },
      'Lacs': {
        cities: {
          'Yamoussoukro': {
            communes: ['Attiégouakro', 'Kpouébo', 'Lolobo', 'Morofé', 'N\'Gattakro', 'Yamoussoukro-Centre'],
            quartiers: ['Yamoussoukro Centre', 'Attiégouakro Centre', 'Kpouébo Centre', 'Lolobo Centre', 'Morofé Centre', 'N\'Gattakro Centre'],
          },
        },
      },
      'Vallée du Bandama': {
        cities: {
          'Bouaké': {
            communes: ['Bouaké-Centre', 'Brobo', 'Didiévi', 'Sakassou', 'Toumodi'],
            quartiers: ['Bouaké Centre', 'Brobo Centre', 'Didiévi Centre', 'Sakassou Centre', 'Toumodi Centre'],
          },
        },
      },
      'Haut-Sassandra': {
        cities: {
          'Daloa': {
            communes: ['Daloa-Centre', 'Issia', 'Vavoua', 'Zoukougbeu', 'Gagnoa'],
            quartiers: ['Daloa Centre', 'Issia Centre', 'Vavoua Centre', 'Zoukougbeu Centre', 'Gagnoa Centre'],
          },
        },
      },
    },
  },
  // Ajouter d'autres pays selon les besoins
};
