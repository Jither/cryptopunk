import test from "ava";
import { testAsciiHash } from "../_testutils";
import { CrcTransform } from "transforms/checksums/crc";

function doTest(title, expectedHex, inputAscii, variant)
{
	test(`Calculates ${title} checksum`, testAsciiHash, CrcTransform, expectedHex, inputAscii, { variant: variant });
}

doTest("CRC-16 (ARC)"			, "bb3d", "123456789", "crc-16-arc");
doTest("CRC-16 (X-25)"			, "906e", "123456789", "crc-16-x25");
doTest("CRC-16 (KERMIT)"		, "2189", "123456789", "crc-16-kermit");
doTest("CRC-16 (XMODEM)"		, "31c3", "123456789", "crc-16-xmodem");

doTest("CRC-24 (OpenPGP)"		, "21cf02", "123456789", "crc-24");

doTest("CRC-32"					, "cbf43926", "123456789", "crc-32");
doTest("CRC-32 (bzip2)"			, "fc891918", "123456789", "crc-32-bzip2");
doTest("CRC-32C"				, "e3069283", "123456789", "crc-32c");
doTest("CRC-32D"				, "87315576", "123456789", "crc-32d");
doTest("CRC-32 (MPEG-2)"		, "0376e6e7", "123456789", "crc-32-mpeg2");
doTest("CRC-32 (Posix)"			, "765e7680", "123456789", "crc-32-posix");
doTest("CRC-32Q"				, "3010bf7f", "123456789", "crc-32q");
