// T40: the share extension opens luminotes://dataUrl=…; expo-share-intent reads it and the layout opens /share.
// Here it only keeps expo-router from treating that link as a route of its own.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path.includes('dataUrl=') ? '/' : path;
}
