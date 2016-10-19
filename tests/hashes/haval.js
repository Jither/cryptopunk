import test from "ava";
import { HavalTransform } from "transforms/hashes/haval";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiHaval(t, expectedHex, input, length, passes)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new HavalTransform();
	const options = { passes: passes, length: length };
	t.deepEqual(tf.transform(bytesInput, options), expected);
}

test("Hashes HAVAL cert vector #1", testAsciiHaval, "c68f39913f901f3ddf44c707357a7d70", "", 128, 3);
test("Hashes HAVAL cert vector #2", testAsciiHaval, "4da08f514a7275dbc4cece4a347385983983a830", "a", 160, 3);
test("Hashes HAVAL cert vector #3", testAsciiHaval, "0c1396d7772689c46773f3daaca4efa982adbfb2f1467eea", "HAVAL", 192, 4);
test("Hashes HAVAL cert vector #4", testAsciiHaval, "bebd7816f09baeecf8903b1b9bc672d9fa428e462ba699f814841529", "0123456789", 224, 4);
test("Hashes HAVAL cert vector #5", testAsciiHaval, "c9c7d8afa159fd9e965cb83ff5ee6f58aeda352c0eff005548153a61551c38ee", "abcdefghijklmnopqrstuvwxyz", 256, 5);
test("Hashes HAVAL cert vector #6", testAsciiHaval, "b45cb6e62f2b1320e4f8f1b0b273d45add47c321fd23999dcf403ac37636d963", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 256, 5);
