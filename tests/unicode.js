import test from "ava";
import { Ucs2ToBytesTransform, BytesToUcs2Transform, Utf8ToBytesTransform, Utf16ToBytesTransform, BytesToUtf16Transform } from "transforms/unicode";
import { testStringToBytes, testBytesToString, testHandlesEmptyString, testHandlesEmptyArray } from "./_testutils";
import { TransformError } from "transforms/transforms";

// UCS-2

test("Decodes UCS-2 (BE)", testStringToBytes, Ucs2ToBytesTransform, "5b834e0d662f4e004e2a586b5b576e38620f", "它不是一个填字游戏");
test("Decodes UCS-2 (LE)", testStringToBytes, Ucs2ToBytesTransform, "835b0d4e2f66004e2a4e6b58575b386e0f62", "它不是一个填字游戏", { littleEndian: true });

// TODO: Test SMP (shouldn't decode in UCS-2)

test("UCS-2 Decoder handles empty string gracefully", testHandlesEmptyString, Ucs2ToBytesTransform);

test("Encodes UCS-2 (BE)", testBytesToString, BytesToUcs2Transform, "它不是一个填字游戏", "5b834e0d662f4e004e2a586b5b576e38620f");
test("Encodes UCS-2 (LE)", testBytesToString, BytesToUcs2Transform, "它不是一个填字游戏", "835b0d4e2f66004e2a4e6b58575b386e0f62", { littleEndian: true });

test("UCS-2 Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToUcs2Transform);

// UTF-8
test("Decodes UTF-8 Latin", testStringToBytes, Utf8ToBytesTransform, "c3a6c3b8c3a5c386c398c385c2a7c2a4c3b1", "æøåÆØÅ§¤ñ");
test("Decodes UTF-8 BMP", 	testStringToBytes, Utf8ToBytesTransform, "ce9eceb5cf83cebaceb5cf80ceacceb6cf89", "Ξεσκεπάζω");
test("Decodes UTF-8 SMP",	testStringToBytes, Utf8ToBytesTransform, "f0a09c8ef0a0beb4f0a2b58cf0a8b392", "𠜎𠾴𢵌𨳒");

test("UTF-8 Decoder handles empty string gracefully", testHandlesEmptyString, Utf8ToBytesTransform);

// TODO: Test UTF-8 Encoding

// UTF-16

test("Decodes UTF-16 BMP (BE)",	testStringToBytes, Utf16ToBytesTransform, "039e03b503c303ba03b503c003ac03b603c9", "Ξεσκεπάζω");
test("Decodes UTF-16 SMP (BE)", testStringToBytes, Utf16ToBytesTransform, "d841df0ed843dfb4d84bdd4cd863dcd2", "𠜎𠾴𢵌𨳒");
test("Decodes UTF-16 BMP (LE)", testStringToBytes, Utf16ToBytesTransform, "9e03b503c303ba03b503c003ac03b603c903", "Ξεσκεπάζω", { littleEndian: true });
test("Decodes UTF-16 SMP (LE)", testStringToBytes, Utf16ToBytesTransform, "41d80edf43d8b4df4bd84cdd63d8d2dc", "𠜎𠾴𢵌𨳒", { littleEndian: true });

test("UTF-16 Decoder handles empty string gracefully", testHandlesEmptyString, Utf16ToBytesTransform);

test("Encodes UTF-16 BMP (BE)", testBytesToString, BytesToUtf16Transform, "Ξεσκεπάζω", "039e03b503c303ba03b503c003ac03b603c9");
test("Encodes UTF-16 SMP (BE)", testBytesToString, BytesToUtf16Transform, "𠜎𠾴𢵌𨳒", "d841df0ed843dfb4d84bdd4cd863dcd2");
test("Encodes UTF-16 BMP (LE)", testBytesToString, BytesToUtf16Transform, "Ξεσκεπάζω", "9e03b503c303ba03b503c003ac03b603c903", { littleEndian: true });
test("Encodes UTF-16 SMP (LE)", testBytesToString, BytesToUtf16Transform, "𠜎𠾴𢵌𨳒", "41d80edf43d8b4df4bd84cdd63d8d2dc", { littleEndian: true });

test("UTF-16 Decoder handles empty array gracefully", testHandlesEmptyArray, BytesToUtf16Transform);
