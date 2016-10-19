import test from "ava";
import { add64, and64, not64, ror64, shr64, xor64 } from "cryptopunk.bitarith";

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

test("and64 ANDs correctly - 2 terms #1"       , assert64, and64, "1111111111111111", "1111111111111111", "1111111111111111");
test("and64 ANDs correctly - 2 terms #2"       , assert64, and64, "1010101010101010", "1010101010101010", "1111111111111111");
test("and64 ANDs correctly - 2 terms #3"       , assert64, and64, "0020204040202000", "1020304050607080", "8070605040302010");
test("and64 ANDs correctly - multiple terms #1", assert64, and64, "0000000000000000", "1020304050607080", "8070605040302010", "1010101010101010");
test("and64 ANDs correctly - multiple terms #2", assert64, and64, "0020200404202000", "1122334455667788", "8877665544332211", "2424242424242424");

test("not64 NOTs correctly #1"				   , assert64, not64, "123456789abcdef0", "edcba9876543210f");
test("not64 NOTs correctly #2"				   , assert64, not64, "ffffffff00000000", "00000000ffffffff");

test("ror64 does ROR(16) correctly"            , assert64, ror64, "cdef0123456789ab", "0123456789abcdef", 16);
test("ror64 does ROR(20) correctly"            , assert64, ror64, "bcdef0123456789a", "0123456789abcdef", 20);
test("ror64 does ROR(24) correctly"            , assert64, ror64, "abcdef0123456789", "0123456789abcdef", 24);
test("ror64 does ROR(28) correctly"            , assert64, ror64, "9abcdef012345678", "0123456789abcdef", 28);
test("ror64 does ROR(32) correctly"            , assert64, ror64, "89abcdef01234567", "0123456789abcdef", 32);
test("ror64 does ROR(36) correctly"            , assert64, ror64, "789abcdef0123456", "0123456789abcdef", 36);
test("ror64 does ROR(40) correctly"            , assert64, ror64, "6789abcdef012345", "0123456789abcdef", 40);
test("ror64 does ROR(44) correctly"            , assert64, ror64, "56789abcdef01234", "0123456789abcdef", 44);
test("ror64 does ROR(48) correctly"            , assert64, ror64, "456789abcdef0123", "0123456789abcdef", 48);
test("ror64 does ROR(0 ) correctly"            , assert64, ror64, "0123456789abcdef", "0123456789abcdef", 0);

test("shr64 does SHR(16) correctly"            , assert64, shr64, "00000123456789ab", "0123456789abcdef", 16);
test("shr64 does SHR(20) correctly"            , assert64, shr64, "000000123456789a", "0123456789abcdef", 20);
test("shr64 does SHR(24) correctly"            , assert64, shr64, "0000000123456789", "0123456789abcdef", 24);
test("shr64 does SHR(28) correctly"            , assert64, shr64, "0000000012345678", "0123456789abcdef", 28);
test("shr64 does SHR(32) correctly"            , assert64, shr64, "0000000001234567", "0123456789abcdef", 32);
test("shr64 does SHR(36) correctly"            , assert64, shr64, "0000000000123456", "0123456789abcdef", 36);
test("shr64 does SHR(40) correctly"            , assert64, shr64, "0000000000012345", "0123456789abcdef", 40);
test("shr64 does SHR(44) correctly"            , assert64, shr64, "0000000000001234", "0123456789abcdef", 44);
test("shr64 does SHR(48) correctly"            , assert64, shr64, "0000000000000123", "0123456789abcdef", 48);
test("shr64 does SHR(0 ) correctly"            , assert64, shr64, "0123456789abcdef", "0123456789abcdef", 0);

test("xor64 XORs correctly - 2 terms #1"       , assert64, xor64, "0000000000000000", "1111111111111111", "1111111111111111");
test("xor64 XORs correctly - 2 terms #2"       , assert64, xor64, "0101010101010101", "1010101010101010", "1111111111111111");
test("xor64 XORs correctly - 2 terms #3"       , assert64, xor64, "9050501010505090", "1020304050607080", "8070605040302010");
test("xor64 XORs correctly - multiple terms #1", assert64, xor64, "8040400000404080", "1020304050607080", "8070605040302010", "1010101010101010");
test("xor64 XORs correctly - multiple terms #2", assert64, xor64, "bd717135357171bd", "1122334455667788", "8877665544332211", "2424242424242424");
