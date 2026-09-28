export function storeDirectionsUrl(storeName: string, storeNote?: string | null) {
  const query = encodeURIComponent(
    `${storeName}${storeNote ? " " + storeNote : ""} Mthatha South Africa`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function pinDirectionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function landmarkDirectionsUrl(landmark: string) {
  const query = encodeURIComponent(`${landmark} Mthatha South Africa`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
