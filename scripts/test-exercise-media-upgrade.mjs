import assert from "node:assert/strict";
import fs from "node:fs";
import {
  isSupportedMediaMime,
  isSupportedVideoMime,
  isSupportedImageMime,
  getMaxUploadSizeBytes,
} from "../lib/training-v2/media-config.ts";
import { validateMediaMagicBytes } from "../lib/training-v2/media-file-validation.ts";

console.log("=== TREVO ONE: EXERCISE MEDIA UPGRADE TEST SUITE ===");

// TEST 1: Media Config MIME validation
console.log("\n[Test 1] Testing Media Config MIME rules...");
assert.equal(isSupportedMediaMime("video/mp4"), true, "video/mp4 should be supported");
assert.equal(isSupportedMediaMime("image/gif"), true, "image/gif should be supported");
assert.equal(isSupportedMediaMime("image/jpeg"), true, "image/jpeg should be supported");
assert.equal(isSupportedMediaMime("image/png"), true, "image/png should be supported");
assert.equal(isSupportedMediaMime("image/webp"), true, "image/webp should be supported");
assert.equal(isSupportedMediaMime("image/svg+xml"), false, "SVG must be rejected");
assert.equal(isSupportedMediaMime("video/avi"), false, "AVI must be rejected");
assert.equal(isSupportedVideoMime("video/mp4"), true, "video/mp4 is video");
assert.equal(isSupportedImageMime("image/gif"), true, "image/gif is image");
console.log("  PASS: MIME type categorization is correct.");

// TEST 2: Max Upload Size Rules
console.log("\n[Test 2] Testing Max Upload Size Rules...");
const videoLimit = getMaxUploadSizeBytes("VIDEO");
const gifLimit = getMaxUploadSizeBytes("image/gif");
const imageLimit = getMaxUploadSizeBytes("IMAGE");
const jpegLimit = getMaxUploadSizeBytes("image/jpeg");

assert.equal(videoLimit, 25 * 1024 * 1024, "VIDEO limit should be 25 MiB");
assert.equal(gifLimit, 25 * 1024 * 1024, "GIF limit should be granted 25 MiB for exercise demonstration");
assert.equal(imageLimit, 5 * 1024 * 1024, "Standard static IMAGE limit should be 5 MiB");
assert.equal(jpegLimit, 5 * 1024 * 1024, "JPEG limit should be 5 MiB");
console.log("  PASS: Max upload size rules are correct.");

// TEST 3: Magic Bytes Verification
console.log("\n[Test 3] Testing Magic Bytes verification...");

// 3a. MP4 buffer (ftyp at bytes 4..7)
const mp4Buffer = Buffer.alloc(32);
mp4Buffer.write("ftyp", 4, "ascii");
const mp4Result = validateMediaMagicBytes(mp4Buffer, "video/mp4");
assert.equal(mp4Result.valid, true, "MP4 signature should be valid");
assert.equal(mp4Result.detectedMime, "video/mp4");
assert.equal(mp4Result.mediaType, "VIDEO");
assert.equal(mp4Result.extension, ".mp4");

// 3b. GIF89a buffer
const gif89Buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
const gif89Result = validateMediaMagicBytes(gif89Buffer, "image/gif");
assert.equal(gif89Result.valid, true, "GIF89a signature should be valid");
assert.equal(gif89Result.detectedMime, "image/gif");
assert.equal(gif89Result.mediaType, "IMAGE");
assert.equal(gif89Result.extension, ".gif");

// 3c. GIF87a buffer
const gif87Buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00]);
const gif87Result = validateMediaMagicBytes(gif87Buffer, "image/gif");
assert.equal(gif87Result.valid, true, "GIF87a signature should be valid");
assert.equal(gif87Result.detectedMime, "image/gif");

// 3d. JPEG buffer
const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const jpegResult = validateMediaMagicBytes(jpegBuffer, "image/jpeg");
assert.equal(jpegResult.valid, true, "JPEG signature should be valid");
assert.equal(jpegResult.detectedMime, "image/jpeg");

// 3e. Reject Mismatched MIME
const mismatchResult = validateMediaMagicBytes(gif89Buffer, "video/mp4");
assert.equal(mismatchResult.valid, false, "Should reject GIF declared as MP4");

// 3f. Reject Fake/Text buffer
const textBuffer = Buffer.from("<html><body>Malicious payload</body></html>");
const fakeResult = validateMediaMagicBytes(textBuffer, "video/mp4");
assert.equal(fakeResult.valid, false, "Should reject text buffer");
console.log("  PASS: Magic bytes inspection enforces container integrity.");

// TEST 4: Frame Capture Module Existence & Exports
console.log("\n[Test 4] Testing media-frame-capture.ts exports...");
const captureCode = fs.readFileSync("lib/training-v2/media-frame-capture.ts", "utf8");
assert.ok(captureCode.includes("export async function captureVideoFirstFrame"), "Must export captureVideoFirstFrame");
assert.ok(captureCode.includes("export async function captureGifFirstFrame"), "Must export captureGifFirstFrame");
assert.ok(captureCode.includes("export async function captureExerciseMediaFirstFrame"), "Must export captureExerciseMediaFirstFrame");
assert.ok(captureCode.includes("export function frameBlobToFile"), "Must export frameBlobToFile");
console.log("  PASS: Frame capture helpers exported properly.");

// TEST 5: Verify Repository & Actions Media Rules
console.log("\n[Test 5] Verifying repository & actions compatibility...");
const mediaRepoCode = fs.readFileSync("lib/training-v2/media-repository.ts", "utf8");
assert.ok(
  mediaRepoCode.includes('ma.mime_type !== "image/gif"'),
  "START_IMAGE must reject animated GIF to enforce static frame requirement"
);
assert.ok(
  mediaRepoCode.includes('ma.mime_type === "image/gif"'),
  "EXECUTION_VIDEO must allow image/gif as execution media"
);

const adminActionsCode = fs.readFileSync("app/admin/exercicios/actions.ts", "utf8");
assert.ok(
  !adminActionsCode.includes('error: "A foto da posição inicial (START_IMAGE) é obrigatória para publicar um exercício oficial Trevo One."'),
  "Manual START_IMAGE must no longer be required for publishing"
);

const exRepoCode = fs.readFileSync("lib/training-v2/exercise-repository.ts", "utf8");
assert.ok(
  exRepoCode.includes("mediaByExerciseId"),
  "listExercisesForProfessional must batch-load attached media"
);
console.log("  PASS: Repository and action rules adhere strictly to spec.");

// TEST 6: Picker & Student View Media Handlers
console.log("\n[Test 6] Verifying picker and student workout playback rules...");
const pickerCode = fs.readFileSync("components/consultancies/training-v2/unified-exercise-picker.tsx", "utf8");
assert.ok(pickerCode.includes("previewingExerciseId"), "Picker must support inline preview");
assert.ok(pickerCode.includes("Ver execução"), "Picker must offer Ver execução action");
assert.ok(pickerCode.includes("thumbnailUrl"), "Picker must show thumbnail/cover frame");
assert.ok(pickerCode.includes("muted"), "Video in picker must be muted for performance");
assert.ok(pickerCode.includes("loop"), "Video in picker must loop");

const studentCode = fs.readFileSync("components/consultancies/training-v2/student-workout-renderer.tsx", "utf8");
assert.ok(studentCode.includes("autoPlay"), "Student video must autoPlay");
assert.ok(studentCode.includes("loop"), "Student video must loop");
assert.ok(studentCode.includes("muted"), "Student video must be muted");
assert.ok(studentCode.includes("playsInline"), "Student video must playsInline");
assert.ok(studentCode.includes("controls"), "Student video must provide controls (pause/play)");
console.log("  PASS: Picker and Student playback configurations validated.");

console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n");
