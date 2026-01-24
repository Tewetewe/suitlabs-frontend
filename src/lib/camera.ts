/**
 * Capture photo from device camera using getUserMedia API
 * Returns image as base64 encoded data URL
 */
export async function capturePhoto(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      reject(new Error("Camera is not supported by your browser"));
      return;
    }

    // Create hidden video element
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const constraints = {
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();

          // Wait for video to be ready
          setTimeout(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0);
            }

            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());

            // Convert to base64
            const imageData = canvas.toDataURL("image/jpeg", 0.8);
            resolve(imageData);
          }, 100);
        };
      })
      .catch((error) => {
        let errorMessage = "Failed to access camera";
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Camera permission denied. Please enable camera access in your browser settings.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera device found";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera is already in use by another application";
        }
        reject(new Error(errorMessage));
      });
  });
}

/**
 * Upload image data to backend storage
 * @param imageData Base64 encoded image data
 * @param token Auth token for API request
 * @returns URL of uploaded image
 */
export async function uploadImage(
  imageData: string,
  token: string
): Promise<string> {
  try {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();

    // Create FormData
    const formData = new FormData();
    formData.append("file", blob, `selfie-${Date.now()}.jpg`);

    // Upload to backend
    const uploadResponse = await fetch(
      "https://api.stg.trywiguna.xyz/api/v1/storage/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image");
    }

    const uploadData = await uploadResponse.json();
    return uploadData.url || uploadData.file_url || uploadData.path;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

/**
 * Check if browser supports camera
 */
export function isCameraSupported(): boolean {
  return !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  );
}
