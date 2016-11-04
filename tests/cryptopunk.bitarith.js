import test from "ava";
import { add64, and64, not64, rol64, ror64, shr64, sub64, xor64 } from "cryptopunk.bitarith";

function assert64(t, action, expectedHex, ... termsHex)
{
	const terms = [];
	for (let i = 0; i < termsHex.length; i++)
	{
		const termHex = termsHex[i];
		if (!(typeof termHex === "string"))
		{
			terms.push(termHex);
		}
		else
		{
			terms.push(
				{
					hi: parseInt(termHex.substr(0, 8), 16),
					lo: parseInt(termHex.substr(8, 8), 16)
				}
			);
		}
	}

	const actual = action(...terms);
	const actualHi = (actual.hi >>> 0);
	const actualLo = (actual.lo >>> 0);
	const actualHex = 	("00000000" + actualHi.toString(16)).substr(-8) +
						("00000000" + actualLo.toString(16)).substr(-8);
	t.is(expectedHex.toLowerCase(), actualHex.toLowerCase());
}

test("add64 adds correctly - 2 terms #1"       , assert64, add64, "0000000003333333", "0000000001111111", "0000000002222222");
test("add64 adds correctly - 2 terms #2"       , assert64, add64, "00000001fffffffe", "00000000ffffffff", "00000000ffffffff");
test("add64 adds correctly - 2 terms #3"       , assert64, add64, "0001999999999998", "0000cccccccccccc", "0000cccccccccccc");
test("add64 adds correctly - multiple terms"   , assert64, add64, "0000000133333332", "0000000055555555", "0000000066666666", "0000000077777777");
test("add64 adds correctly - overflow"         , assert64, add64, "dddddddddddddddc", "eeeeeeeeeeeeeeee", "eeeeeeeeeeeeeeee");
test("add64 adds correctly - overflow 1"       , assert64, add64, "0000000000000000", "ffffffffffffffff", "0000000000000001");

test("sub64 subtracts correctly"               , assert64, sub64, "0000000001111111", "0000000003333333", "0000000002222222");
test("sub64 subtracts correctly - zero"        , assert64, sub64, "abcdef0123456789", "abcdef0123456789", "0000000000000000");
test("sub64 subtracts correctly - overflow"    , assert64, sub64, "eeeeeeeeeeeeeeee", "dddddddddddddddc", "eeeeeeeeeeeeeeee");
test("sub64 subtracts correctly - overflow 1"  , assert64, sub64, "ffffffffffffffff", "0000000000000000", "0000000000000001");

test("and64 ANDs correctly - 2 terms #1"       , assert64, and64, "1111111111111111", "1111111111111111", "1111111111111111");
test("and64 ANDs correctly - 2 terms #2"       , assert64, and64, "1010101010101010", "1010101010101010", "1111111111111111");
test("and64 ANDs correctly - 2 terms #3"       , assert64, and64, "0020204040202000", "1020304050607080", "8070605040302010");
test("and64 ANDs correctly - multiple terms #1", assert64, and64, "0000000000000000", "1020304050607080", "8070605040302010", "1010101010101010");
test("and64 ANDs correctly - multiple terms #2", assert64, and64, "0020200404202000", "1122334455667788", "8877665544332211", "2424242424242424");

test("not64 NOTs correctly #1"				   , assert64, not64, "123456789abcdef0", "edcba9876543210f");
test("not64 NOTs correctly #2"				   , assert64, not64, "ffffffff00000000", "00000000ffffffff");

test("ror64 does ROR(16) correctly"            , assert64, ror64, "ba9801234567fedc", "01234567fedcba98", 16);
test("ror64 does ROR(20) correctly"            , assert64, ror64, "cba9801234567fed", "01234567fedcba98", 20);
test("ror64 does ROR(24) correctly"            , assert64, ror64, "dcba9801234567fe", "01234567fedcba98", 24);
test("ror64 does ROR(28) correctly"            , assert64, ror64, "edcba9801234567f", "01234567fedcba98", 28);
test("ror64 does ROR(32) correctly"            , assert64, ror64, "fedcba9801234567", "01234567fedcba98", 32);
test("ror64 does ROR(36) correctly"            , assert64, ror64, "7fedcba980123456", "01234567fedcba98", 36);
test("ror64 does ROR(40) correctly"            , assert64, ror64, "67fedcba98012345", "01234567fedcba98", 40);
test("ror64 does ROR(44) correctly"            , assert64, ror64, "567fedcba9801234", "01234567fedcba98", 44);
test("ror64 does ROR(48) correctly"            , assert64, ror64, "4567fedcba980123", "01234567fedcba98", 48);
test("ror64 does ROR(0 ) correctly"            , assert64, ror64, "01234567fedcba98", "01234567fedcba98", 0);

test("rol64 does ROL(16) correctly"            , assert64, rol64, "4567fedcba980123", "01234567fedcba98", 16);
test("rol64 does ROL(20) correctly"            , assert64, rol64, "567fedcba9801234", "01234567fedcba98", 20);
test("rol64 does ROL(24) correctly"            , assert64, rol64, "67fedcba98012345", "01234567fedcba98", 24);
test("rol64 does ROL(28) correctly"            , assert64, rol64, "7fedcba980123456", "01234567fedcba98", 28);
test("rol64 does ROL(32) correctly"            , assert64, rol64, "fedcba9801234567", "01234567fedcba98", 32);
test("rol64 does ROL(36) correctly"            , assert64, rol64, "edcba9801234567f", "01234567fedcba98", 36);
test("rol64 does ROL(40) correctly"            , assert64, rol64, "dcba9801234567fe", "01234567fedcba98", 40);
test("rol64 does ROL(44) correctly"            , assert64, rol64, "cba9801234567fed", "01234567fedcba98", 44);
test("rol64 does ROL(48) correctly"            , assert64, rol64, "ba9801234567fedc", "01234567fedcba98", 48);
test("rol64 does ROL(0 ) correctly"            , assert64, rol64, "01234567fedcba98", "01234567fedcba98", 0);

test("shr64 does SHR(16) correctly"            , assert64, shr64, "000001234567fedc", "01234567fedcba98", 16);
test("shr64 does SHR(20) correctly"            , assert64, shr64, "0000001234567fed", "01234567fedcba98", 20);
test("shr64 does SHR(24) correctly"            , assert64, shr64, "00000001234567fe", "01234567fedcba98", 24);
test("shr64 does SHR(28) correctly"            , assert64, shr64, "000000001234567f", "01234567fedcba98", 28);
test("shr64 does SHR(32) correctly"            , assert64, shr64, "0000000001234567", "01234567fedcba98", 32);
test("shr64 does SHR(36) correctly"            , assert64, shr64, "0000000000123456", "01234567fedcba98", 36);
test("shr64 does SHR(40) correctly"            , assert64, shr64, "0000000000012345", "01234567fedcba98", 40);
test("shr64 does SHR(44) correctly"            , assert64, shr64, "0000000000001234", "01234567fedcba98", 44);
test("shr64 does SHR(48) correctly"            , assert64, shr64, "0000000000000123", "01234567fedcba98", 48);
test("shr64 does SHR(0 ) correctly"            , assert64, shr64, "01234567fedcba98", "01234567fedcba98", 0);

test("xor64 XORs correctly - 2 terms #1"       , assert64, xor64, "0000000000000000", "1111111111111111", "1111111111111111");
test("xor64 XORs correctly - 2 terms #2"       , assert64, xor64, "0101010101010101", "1010101010101010", "1111111111111111");
test("xor64 XORs correctly - 2 terms #3"       , assert64, xor64, "9050501010505090", "1020304050607080", "8070605040302010");
test("xor64 XORs correctly - multiple terms #1", assert64, xor64, "8040400000404080", "1020304050607080", "8070605040302010", "1010101010101010");
test("xor64 XORs correctly - multiple terms #2", assert64, xor64, "bd717135357171bd", "1122334455667788", "8877665544332211", "2424242424242424");
