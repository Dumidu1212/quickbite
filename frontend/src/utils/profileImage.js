// src/utils/profileImage.js
//
// Utility functions for profile image storage and retrieval.
//
// CURRENT IMPLEMENTATION — sessionStorage (prototype):
//   Images are stored as base64 strings in sessionStorage, keyed by userId.
//   sessionStorage is cleared when the browser tab closes.
//   Maximum recommended size: 200KB after compression (enforced in the upload handler).
//
// PRODUCTION IMPLEMENTATION — what this would look like in a real system:
//   1. User selects an image in the browser
//   2. Frontend calls POST /users/profile/image with multipart/form-data
//   3. User service validates file type and size
//   4. User service uploads the binary to Azure Blob Storage
//   5. Azure returns a CDN URL (e.g. https://quickbite.blob.core.windows.net/avatars/userId.jpg)
//   6. User service stores that URL in the users MongoDB document
//   7. Frontend receives the URL and renders it as a normal <img src="...">
//
// WHY NOT localStorage?
//   localStorage persists indefinitely. A base64 image is large (~100-300KB).
//   Filling localStorage with image data would impact other browser storage.
//   sessionStorage is scoped to the tab and clears automatically on close.

// Storage key format: quickbite_avatar_<userId>
// Including userId prevents one user's avatar showing for another
const storageKey = (userId) => `quickbite_avatar_${userId}`;

/**
 * Saves a base64-encoded image string to sessionStorage for the given user.
 *
 * @param {string} userId  - The user's MongoDB ID
 * @param {string} base64  - The base64 data URL string (e.g. "data:image/jpeg;base64,...")
 */
export const saveProfileImage = (userId, base64) => {
  try {
    sessionStorage.setItem(storageKey(userId), base64);
  } catch (err) {
    // sessionStorage quota exceeded — this can happen if the image is too large
    console.warn('[profileImage] Could not save image to sessionStorage:', err);
  }
};

/**
 * Retrieves the stored base64 image for the given user.
 * Returns null if no image has been saved for this user.
 *
 * @param {string} userId
 * @returns {string|null}
 */
export const loadProfileImage = (userId) => {
  try {
    return sessionStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};

/**
 * Removes the stored profile image for the given user.
 * Called when the user removes their avatar or on logout.
 *
 * @param {string} userId
 */
export const clearProfileImage = (userId) => {
  sessionStorage.removeItem(storageKey(userId));
};

/**
 * Reads a File object and returns a base64 data URL string.
 * Validates file type (images only) and size (max 2MB before encoding).
 *
 * @param {File} file - The image file selected by the user
 * @returns {Promise<string>} Resolves with the base64 data URL
 * @throws {Error} If the file type is not an image or exceeds 2MB
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    // Validate file type — only images are accepted
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (JPG, PNG, GIF, or WebP)'));
      return;
    }

    // Validate file size — 2MB limit before base64 encoding
    // Base64 adds ~33% overhead, so 2MB file becomes ~2.7MB in storage
    const TWO_MB = 2 * 1024 * 1024;
    if (file.size > TWO_MB) {
      reject(new Error('Image must be smaller than 2MB'));
      return;
    }

    // FileReader converts the binary file to a base64 data URL
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read the image file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Generates a placeholder avatar using the user's initials.
 * Used when no profile image has been uploaded.
 *
 * Returns a data URL for an SVG containing the initials on a colored background.
 * Color is derived from the userId so each user gets a consistent unique color.
 *
 * @param {string} name   - The user's display name
 * @param {string} userId - The user's ID (used to pick a consistent color)
 * @returns {string} SVG data URL
 */
export const generateInitialsAvatar = (name, userId) => {
  // Extract up to two initials from the name
  const initials = name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  // Derive a consistent hue from the userId string
  // charCodeAt sums give a number we can use as a color seed
  const hue = userId
    .split('')
    .reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % 360;

  const bgColor = `hsl(${hue}, 55%, 55%)`;

  // Build an SVG with the initials centered on a colored circle
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${bgColor}"/>
      <text
        x="50" y="50"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="system-ui, sans-serif"
        font-size="38"
        font-weight="500"
        fill="white"
      >${initials}</text>
    </svg>
  `.trim();

  // Encode as a data URL so it can be used directly as <img src="...">
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
