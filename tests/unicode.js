import test from "ava";
import { Ucs2ToBytesTransform, BytesToUcs2Transform, Utf8ToBytesTransform, Utf16ToBytesTransform, BytesToUtf16Transform } from "transforms/unicode";
import { TransformError } from "transforms/transforms";
import { hexToBytes } from "cryptopunk.utils";

function testUcs2Decode(t, expectedHex, input, options)
{
	const expected = hexToBytes(expectedHex);
	const tf = new Ucs2ToBytesTransform();
	t.deepEqual(tf.transform(input, options), expected);
}

function testUtf8Decode(t, expectedHex, input, options)
{
	const expected = hexToBytes(expectedHex);
	const tf = new Utf8ToBytesTransform();
	t.deepEqual(tf.transform(input, options), expected);
}

function testUtf16Decode(t, expectedHex, input, options)
{
	const expected = hexToBytes(expectedHex);
	const tf = new Utf16ToBytesTransform();
	t.deepEqual(tf.transform(input, options), expected);
}

// UCS-2

test("Decodes UCS-2 (BE)", testUcs2Decode, "5b834e0d662f4e004e2a586b5b576e38620f", "它不是一个填字游戏");
test("Decodes UCS-2 (LE)", testUcs2Decode, "835b0d4e2f66004e2a4e6b58575b386e0f62", "它不是一个填字游戏", { littleEndian: true });

// TODO: Test SMP (shouldn't decode in UCS-2)

test("UCS-2 Decoder handles empty string gracefully", t => {
	const tf = new Ucs2ToBytesTransform();

	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
});

test("Encodes simple UCS-2 (BE)", t => {
	const tf = new BytesToUcs2Transform();

	t.is(tf.transform([0x5b, 0x83, 0x4e, 0x0d, 0x66, 0x2f, 0x4e, 0x00, 0x4e, 0x2a, 0x58, 0x6b, 0x5b, 0x57, 0x6e, 0x38, 0x62, 0x0f]), "它不是一个填字游戏");
});

test("Encodes UCS-2 (LE)", t => {
	const tf = new BytesToUcs2Transform();

	t.is(tf.transform([0x83, 0x5b, 0x0d, 0x4e, 0x2f, 0x66, 0x00, 0x4e, 0x2a, 0x4e, 0x6b, 0x58, 0x57, 0x5b, 0x38, 0x6e, 0x0f, 0x62], { littleEndian: true }), "它不是一个填字游戏");
});

test("UCS-2 Encoder handles empty array gracefully", t => {
	const tf = new BytesToUcs2Transform();

	t.deepEqual(tf.transform([]), "");
});

// UTF-8
test("Decodes UTF-8 Latin", testUtf8Decode, "c3a6c3b8c3a5c386c398c385c2a7c2a4c3b1", "æøåÆØÅ§¤ñ");
test("Decodes UTF-8 BMP", 	testUtf8Decode, "ce9eceb5cf83cebaceb5cf80ceacceb6cf89", "Ξεσκεπάζω");
test("Decodes UTF-8 SMP",	testUtf8Decode, "f0a09c8ef0a0beb4f0a2b58cf0a8b392", "𠜎𠾴𢵌𨳒");

test("UTF-8 Decoder handles empty string gracefully", t => {
	const tf = new Utf8ToBytesTransform();

	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
});


// UTF-16

test("Decodes UTF-16 BMP (BE)",	testUtf16Decode, "039e03b503c303ba03b503c003ac03b603c9", "Ξεσκεπάζω");
test("Decodes UTF-16 SMP (BE)", testUtf16Decode, "d841df0ed843dfb4d84bdd4cd863dcd2", "𠜎𠾴𢵌𨳒");
test("Decodes UTF-16 BMP (LE)", testUtf16Decode, "9e03b503c303ba03b503c003ac03b603c903", "Ξεσκεπάζω", { littleEndian: true });
test("Decodes UTF-16 SMP (LE)", testUtf16Decode, "41d80edf43d8b4df4bd84cdd63d8d2dc", "𠜎𠾴𢵌𨳒", { littleEndian: true });

test("Encodes UTF-16 BMP (BE)", t => {
	const tf = new BytesToUtf16Transform();

	t.deepEqual(tf.transform([0x03, 0x9e, 0x03, 0xb5, 0x03, 0xc3, 0x03, 0xba, 0x03, 0xb5, 0x03, 0xc0, 0x03, 0xac, 0x03, 0xb6, 0x03, 0xc9]), "Ξεσκεπάζω");
});

test("Encodes UTF-16 SMP (BE)", t => {
	const tf = new BytesToUtf16Transform();

	t.deepEqual(tf.transform([0xd8, 0x41, 0xdf, 0x0e, 0xd8, 0x43, 0xdf, 0xb4, 0xd8, 0x4b, 0xdd, 0x4c, 0xd8, 0x63, 0xdc, 0xd2]), "𠜎𠾴𢵌𨳒");
});

test("Encodes UTF-16 BMP (LE)", t => {
	const tf = new BytesToUtf16Transform();

	t.deepEqual(tf.transform([0x9e, 0x03, 0xb5, 0x03, 0xc3, 0x03, 0xba, 0x03, 0xb5, 0x03, 0xc0, 0x03, 0xac, 0x03, 0xb6, 0x03, 0xc9, 0x03], { littleEndian: true }), "Ξεσκεπάζω");
});

test("Encodes UTF-16 SMP (LE)", t => {
	const tf = new BytesToUtf16Transform();

	t.deepEqual(tf.transform([0x41, 0xd8, 0x0e, 0xdf, 0x43, 0xd8, 0xb4, 0xdf, 0x4b, 0xd8, 0x4c, 0xdd, 0x63, 0xd8, 0xd2, 0xdc], { littleEndian: true }), "𠜎𠾴𢵌𨳒");
});
