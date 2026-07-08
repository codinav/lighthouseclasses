/**
 * Sign-in with Google via Google Identity Services (client-side OAuth2
 * token flow) — works on static hosting, no backend required.
 *
 * Flow: load the GIS SDK → open Google's popup → receive an access token
 * → fetch the verified profile from Google's userinfo endpoint.
 */
import { GOOGLE_CLIENT_ID } from "./config";

export interface GoogleProfile {
  name: string;
  email: string;
  picture?: string;
  email_verified?: boolean;
}

/* Minimal typings for the GIS SDK */
interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadGoogleSdk(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Couldn't load Google Sign-In. Check your internet connection."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export async function signInWithGoogle(): Promise<GoogleProfile> {
  await loadGoogleSdk();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Sign-In SDK unavailable.");
  }

  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? "Google sign-in was cancelled."));
      },
      error_callback: (error) => {
        reject(
          new Error(
            error.type === "popup_closed"
              ? "The Google window was closed before signing in."
              : (error.message ?? "Google sign-in failed.")
          )
        );
      },
    });
    client.requestAccessToken();
  });

  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Couldn't fetch your Google profile. Please try again.");
  const profile = (await res.json()) as GoogleProfile;
  if (!profile.email) throw new Error("Google didn't return an email address.");
  return profile;
}
