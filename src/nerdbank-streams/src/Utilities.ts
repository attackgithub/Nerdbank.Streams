import CancellationToken from "cancellationtoken";
import { Deferred } from "./Deferred";
import { IDisposableObservable } from "./IDisposableObservable";

export async function getBufferFrom(
    readable: NodeJS.ReadableStream,
    size: number,
    allowEndOfStream: boolean = false,
    cancellationToken?: CancellationToken): Promise<Buffer> {

    const streamEnded = new Deferred<void>();
    while (size > 0) {
        const readBuffer = readable.read(size) as Buffer;
        if (readBuffer === null) {
            const bytesAvailable = new Deferred<void>();
            readable.once("readable", bytesAvailable.resolve.bind(bytesAvailable));
            readable.once("end", streamEnded.resolve.bind(streamEnded));
            await Promise.race([bytesAvailable.promise, streamEnded.promise]);
            if (bytesAvailable.isCompleted) {
                continue;
            }
        }

        if (!allowEndOfStream) {
            if (!readBuffer || readBuffer.length < size) {
                throw new Error("Stream terminated before required bytes were read.");
            }
        }

        return readBuffer || new Buffer([]);
    }
}

export function throwIfDisposed(value: IDisposableObservable) {
    if (value.isDisposed) {
        throw new Error("disposed");
    }
}

export function requireInteger(
    parameterName: string,
    value: number,
    serializedByteLength: number,
    signed: "unsigned" | "signed" = "signed"): void {

    if (!Number.isInteger(value)) {
        throw new Error(`${parameterName} must be an integer.`);
    }

    let bits = serializedByteLength * 8;
    if (signed === "signed") {
        bits--;
    }

    const maxValue = Math.pow(2, bits) - 1;
    const minValue = signed === "signed" ? -Math.pow(2, bits) : 0;
    if (value > maxValue || value < minValue) {
        throw new Error(`${parameterName} must be in the range ${minValue}-${maxValue}.`);
    }
}

export function removeFromQueue<T>(value: T, queue: T[]) {
    if (queue) {
        const idx = queue.indexOf(value);
        if (idx >= 0) {
            queue.splice(idx, 1);
        }
    }
}
