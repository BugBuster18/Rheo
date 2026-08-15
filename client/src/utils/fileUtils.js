/**
 * DropShare Client — File Chunker Utility
 *
 * Splits a File object into ArrayBuffer chunks for transfer.
 * All chunking happens in the browser — no server involvement.
 *
 * Chunk size default: 1 MB (matches CHUNK_SIZE_BYTES on server).
 * Large chunks = fewer round-trips but more memory pressure.
 * Small chunks = more overhead but finer-grained resume granularity.
 */

const CHUNK_SIZE = 1024 * 1024; // 1 MB

/**
 * Compute total chunks needed for a file.
 * @param {File} file
 * @returns {number}
 */
export function computeTotalChunks(file) {
  return Math.ceil(file.size / CHUNK_SIZE);
}

/**
 * Read chunk N from a File as an ArrayBuffer.
 * @param {File} file
 * @param {number} chunkIndex - 0-based
 * @returns {Promise<ArrayBuffer>}
 */
export function readChunk(file, chunkIndex) {
  return new Promise((resolve, reject) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end   = Math.min(start + CHUNK_SIZE, file.size);
    const blob  = file.slice(start, end);
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e.target.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Compute SHA-256 hash of a File using the Web Crypto API.
 * Called after the file is selected to pre-compute the hash.
 * The receiver computes the same hash and compares.
 * @param {File} file
 * @returns {Promise<string>} hex string
 */
export async function computeFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Format speed to human-readable string.
 * @param {number} bytesPerSecond
 * @returns {string}
 */
export function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Format ETA in seconds to human-readable string.
 * @param {number|null} seconds
 * @returns {string}
 */
export function formatEta(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60)  return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
