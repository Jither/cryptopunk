import test from "ava";
import { NewDesEncryptTransform, NewDesDecryptTransform } from "transforms/block-ciphers/newdes";
import { hexToBytes } from "cryptopunk.utils";

function exerciseMacro(t, keyHex, plainHex, expectedHex)
{
	let key = hexToBytes(keyHex);
	let plain = hexToBytes(plainHex);
	let result;

	const enc = new NewDesEncryptTransform();
	for (let i = 0; i < 30; i++)
	{
		result = enc.transform(plain, key);
		plain = result;
	}
	t.deepEqual(hexToBytes(expectedHex), result);

	const dec = new NewDesDecryptTransform();
	for (let i = 0; i < 30; i++)
	{
		result = dec.transform(result, key);
	}
	t.deepEqual(hexToBytes(plainHex), result);
}

test("NewDES does exercise (p: 0 0 0 0 0 0 0 0)",					exerciseMacro, "1f293b1a353a615dee2e1a2b26204f", "0000000000000000", "b76a613aef09e781");
test("NewDES does exercise (p: 1 2 3 4 5 6 7 8)", 					exerciseMacro, "1f293b1a353a615dee2e1a2b26204f", "0102030405060708", "93e6c2a44e4310ca");
test("NewDES does exercise (p: 10 20 30 40 50 60 70 80)", 			exerciseMacro, "1f293b1a353a615dee2e1a2b26204f", "0a141e28323c4650", "a8318e31b0784cbc");
test("NewDES does exercise (p: 2 2 2 2 2 2 2 2)", 					exerciseMacro, "1f293b1a353a615dee2e1a2b26204f", "0202020202020202", "3045007654dc1f30");
test("NewDES does exercise (p: 101 102 103 104 105 106 107 108)", 	exerciseMacro, "1f293b1a353a615dee2e1a2b26204f", "65666768696a6b6c", "95da9bf3c5aac0cc");
test("NewDES does exercise (p: 12 23 34 45 56 67 78 89)",			exerciseMacro, "1f293b1a353a615dee2e1a2b26204f", "0c17222d38434e59", "0ff2738c09af456a");
