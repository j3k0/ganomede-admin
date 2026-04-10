export interface AdminConfig {
  brandingTitle: string;
  services: string[];
  currencies: string[];
  chatRoomPrefix: string;
  userMetadataList: string[];
}

declare global {
  interface Window {
    __ADMIN_CONFIG__?: AdminConfig;
  }
}

export function getConfig(): AdminConfig {
  return (
    window.__ADMIN_CONFIG__ ?? {
      brandingTitle: "Ganomede",
      services: [],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    }
  );
}
