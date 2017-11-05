import { rorBytes, rolBytes } from "./cryptopunk.bitarith";
import { bytesToHex } from "./cryptopunk.utils";

const a = new Uint8Array([0x01, 0x02, 0x03, 0x10, 0x20, 0x30, 0x40]);

console.log(bytesToHex(a));
rolBytes(a, 12);
console.log(bytesToHex(a));