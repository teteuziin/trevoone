/**
 * TREVO ONE — TRAINING V2 MEDIA FRAME CAPTURE
 * Client-side automatic extraction of the first static frame from MP4 video and GIF animation.
 * Converts execution media frames to JPEG blobs suitable for thumbnails and poster covers.
 */

/**
 * Extracts a valid static initial frame (~0.15s) from an MP4 video file.
 */
export async function captureVideoFirstFrame(videoFile: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return reject(new Error("A captura de frame do vídeo deve ser executada no navegador."));
    }

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite excedido ao capturar o frame do vídeo."));
    }, 10000);

    video.onloadeddata = () => {
      // Seek to ~0.15s to bypass completely black lead-in frames
      const seekTarget = Math.min(0.15, (video.duration || 1) / 2);
      video.currentTime = seekTarget;
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          return reject(new Error("Falha ao inicializar o contexto 2D do canvas."));
        }

        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Falha ao converter o frame do canvas para imagem JPEG."));
            }
          },
          "image/jpeg",
          0.85
        );
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Erro ao carregar o vídeo para extração do frame."));
    };
  });
}

/**
 * Extracts the first static frame from an animated GIF.
 * Drawing an <img> containing a GIF onto a 2D canvas captures its initial frame.
 */
export async function captureGifFirstFrame(gifFile: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return reject(new Error("A captura de frame do GIF deve ser executada no navegador."));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(gifFile);
    img.src = objectUrl;

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      URL.revokeObjectURL(objectUrl);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite excedido ao capturar o frame do GIF."));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const width = img.naturalWidth || 640;
        const height = img.naturalHeight || 360;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          return reject(new Error("Falha ao inicializar o contexto 2D do canvas."));
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Falha ao converter o frame estático do GIF para JPEG."));
            }
          },
          "image/jpeg",
          0.85
        );
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Erro ao carregar o arquivo GIF para extração de frame."));
    };
  });
}

/**
 * Universal auto-capture dispatcher for MP4 and GIF execution media.
 * Returns null if capture fails without throwing, allowing safe fallback.
 */
export async function captureExerciseMediaFirstFrame(
  file: File,
  declaredMime?: string
): Promise<Blob | null> {
  const mime = (declaredMime || file.type || "").toLowerCase().trim();
  const name = file.name.toLowerCase();

  try {
    if (mime === "video/mp4" || name.endsWith(".mp4")) {
      return await captureVideoFirstFrame(file);
    }
    if (mime === "image/gif" || name.endsWith(".gif")) {
      return await captureGifFirstFrame(file);
    }
  } catch (err) {
    console.warn("[MediaFrameCapture] Falha na geração automática do frame estático:", err);
    return null;
  }

  return null;
}

/**
 * Converts a static JPEG blob to a File object ready for upload.
 */
export function frameBlobToFile(blob: Blob, baseName: string = "auto-frame"): File {
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
