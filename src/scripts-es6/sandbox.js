import { gimliPermutation } from "./transforms/shared/gimli";
import { hexToBytes, bytesToHex } from "./cryptopunk.utils";

const inputs = [
	"00000000 9e3779ba 3c6ef37a daa66d46 78dde724 1715611a b54cdb2e 53845566 f1bbcfc8 8ff34a5a 2e2ac522 cc624026"
];

for (const input of inputs)
{
	const bytes = hexToBytes(input);
	console.log(bytesToHex(bytes));
}

console.log("----------------------------------------");

for (const input of inputs)
{
	const bytes = hexToBytes(input);
	gimliPermutation(bytes);
	console.log(bytesToHex(bytes));
}
