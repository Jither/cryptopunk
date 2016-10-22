import test from "ava";
import { testAsciiHash } from "../_testutils";
import { CrcTransform } from "transforms/checksums/crc";

test("Does CRC-16 (ARC) correctly"				, testAsciiHash, CrcTransform, "bb3d", "123456789", { variant: "crc-16-arc" });
test("Does CRC-16 (X-25) correctly"				, testAsciiHash, CrcTransform, "906e", "123456789", { variant: "crc-16-x25" });
test("Does CRC-16 (KERMIT) correctly"			, testAsciiHash, CrcTransform, "2189", "123456789", { variant: "crc-16-kermit" });
test("Does CRC-16 (XMODEM) correctly"			, testAsciiHash, CrcTransform, "31c3", "123456789", { variant: "crc-16-xmodem" });

test("Does CRC-24 (OpenPGP) correctly"			, testAsciiHash, CrcTransform, "21cf02", "123456789", { variant: "crc-24" });

test("Does CRC-32 correctly"					, testAsciiHash, CrcTransform, "cbf43926", "123456789", { variant: "crc-32" });
test("Does CRC-32 (bzip2) correctly"			, testAsciiHash, CrcTransform, "fc891918", "123456789", { variant: "crc-32-bzip2" });
test("Does CRC-32C correctly"					, testAsciiHash, CrcTransform, "e3069283", "123456789", { variant: "crc-32c" });
test("Does CRC-32D correctly"					, testAsciiHash, CrcTransform, "87315576", "123456789", { variant: "crc-32d" });
test("Does CRC-32 (MPEG-2) correctly"			, testAsciiHash, CrcTransform, "0376e6e7", "123456789", { variant: "crc-32-mpeg2" });
test("Does CRC-32 (Posix) correctly"			, testAsciiHash, CrcTransform, "765e7680", "123456789", { variant: "crc-32-posix" });
test("Does CRC-32Q correctly"					, testAsciiHash, CrcTransform, "3010bf7f", "123456789", { variant: "crc-32q" });
