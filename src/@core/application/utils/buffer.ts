import { Buffer } from "buffer";

/** Converts a Node Buffer into an ArrayBuffer for storage service uploads. */
export const bufferToArrayBuffer = (buffer: Buffer): ArrayBuffer => {
    const result = new ArrayBuffer(buffer.byteLength);
    const view = new Uint8Array(result);
    view.set(
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    );
    return result;
};
