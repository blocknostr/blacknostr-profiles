
export type NostrMetadata = {
  name?: string;
  display_name?: string; // NIP-01 uses snake_case
  picture?: string;
  banner?: string;
  about?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
  location?: string; // Adding location to metadata
};
