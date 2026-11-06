export const colors = {
  paper: '#FFF8EF', sheet: '#FFFCF7', ink: '#442B23', muted: '#826E60',
  coral: '#B94D60', rose: '#EF9AA2', sea: '#2E7C7A', line: '#E7D4BF',
};

export const googleMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f7eddd' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#685548' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fff8ef' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b4d7d4' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#dfe7ce' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#fffdf8' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
