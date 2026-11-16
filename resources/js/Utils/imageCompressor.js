/**
 * Utility to compress image files client-side before uploading.
 * Resizes large dimensions and compresses JPEG/WebP quality to reduce file size.
 *
 * @param {File} file
 * @param {Object} options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1600)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1600)
 * @param {number} options.quality - Image quality 0.0 - 1.0 (default: 0.75)
 * @param {string} options.outputType - Target mime type, e.g. 'image/jpeg'
 * @returns {Promise<File>} Compressed File object
 */
export async function compressImage(file, {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.75,
    outputType = 'image/jpeg',
} = {}) {
    // If not an image or SVG/GIF, return as is (SVG is vector, GIF could lose animation)
    if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                let { width, height } = img;

                // Scale down while preserving aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    if (width / height > maxWidth / maxHeight) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        maxHeight = Math.round(maxHeight);
                        height = Math.round((img.height * width) / img.width);
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const targetType = outputType || file.type || 'image/jpeg';

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }

                        // If compressed size is somehow larger than original, keep original
                        if (blob.size >= file.size && file.type === targetType) {
                            resolve(file);
                            return;
                        }

                        // Keep original filename but adjust extension if format changed
                        let fileName = file.name;
                        if (targetType === 'image/jpeg' && !/\.(jpe?g)$/i.test(fileName)) {
                            fileName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
                        } else if (targetType === 'image/webp' && !/\.webp$/i.test(fileName)) {
                            fileName = fileName.replace(/\.[^/.]+$/, '') + '.webp';
                        }

                        const compressedFile = new File([blob], fileName, {
                            type: targetType,
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    targetType,
                    quality
                );
            };

            img.onerror = () => {
                resolve(file);
            };
        };

        reader.onerror = () => {
            resolve(file);
        };
    });
}

/**
 * Compress an array of files concurrently.
 *
 * @param {File[]} files
 * @param {Object} options
 * @returns {Promise<File[]>}
 */
export async function compressImages(files, options = {}) {
    return Promise.all(files.map((file) => compressImage(file, options)));
}
