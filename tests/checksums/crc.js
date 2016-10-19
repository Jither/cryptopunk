import test from "ava";
import { CrcTransform } from "transforms/checksums/crc";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiCrc(t, expectedHex, input, variant)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new CrcTransform();
	const options = {
		variant: variant
	};
	t.deepEqual(tf.transform(bytesInput, options), expected);
}

test("Does CRC-16 (ARC) correctly"				, testAsciiCrc, "bb3d", "123456789", "CRC-16arc");
test("Does CRC-16 (X-25) correctly"				, testAsciiCrc, "906e", "123456789", "CRC-16x25");
test("Does CRC-16 (KERMIT) correctly"			, testAsciiCrc, "2189", "123456789", "CRC-16kermit");
test("Does CRC-16 (XMODEM) correctly"			, testAsciiCrc, "31c3", "123456789", "CRC-16xmodem");

test("Does CRC-24 (OpenPGP) correctly"			, testAsciiCrc, "21cf02", "123456789", "CRC-24");

test("Does CRC-32 correctly"					, testAsciiCrc, "cbf43926", "123456789", "CRC-32");
test("Does CRC-32 (bzip2) correctly"			, testAsciiCrc, "fc891918", "123456789", "CRC-32bzip2");
test("Does CRC-32C correctly"					, testAsciiCrc, "e3069283", "123456789", "CRC-32C");
test("Does CRC-32D correctly"					, testAsciiCrc, "87315576", "123456789", "CRC-32D");
test("Does CRC-32 (MPEG-2) correctly"			, testAsciiCrc, "0376e6e7", "123456789", "CRC-32mpeg2");
test("Does CRC-32 (Posix) correctly"			, testAsciiCrc, "765e7680", "123456789", "CRC-32posix");
test("Does CRC-32Q correctly"					, testAsciiCrc, "3010bf7f", "123456789", "CRC-32Q");
