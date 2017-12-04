import { gfMulTable } from "../../cryptopunk.galois";

let MUL2; // Map of a -> a*{02} in Rijndael field
let MUL3; // Map of a -> a*{03} in Rijndael field
let INV3; // Map of a*{03} -> a in Rijndael field

const S_BOX = [];
const SI_BOX = [];

function generateMulTables()
{
	// 0x11b = Rijndael polynomial (x^8 + x^4 + x^3 + x + 1 = {100011011} = {0x11b})
	MUL2 = gfMulTable(2, 0x11b);
	MUL3 = gfMulTable(3, 0x11b);
	INV3 = [];
	for (let i = 0; i < 256; i++)
	{
		INV3[MUL3[i]] = i;
	}
}

function generateRijndaelSboxes()
{
	if (!MUL3)
	{
		generateMulTables();
	}

	let x = 1, xInv = 1;
	while (!S_BOX[x])
	{
		// Affine transform:
		// This is equivalent to:
		// xInv XOR ROL(xInv, 1) XOR ROL(xInv, 2) XOR ROL(xInv, 3) XOR ROL(xInv, 4) XOR 0x63
		// We simply shift left (into high byte) rather than rotating, and combine the high byte
		// with the low byte afterwards. Then XOR by 0x63
		let s = xInv ^ (xInv << 1) ^ (xInv << 2) ^ (xInv << 3) ^ (xInv << 4);
		s = (s >> 8) ^ (s & 0xff) ^	0x63;

		S_BOX[x] = s;
		SI_BOX[s] = x;

		x = MUL3[x]; // Multiply x by {03}
		xInv = INV3[xInv]; // Divide xInv by {03}
	}

	// Multiplicative inverse is undefined for 0:
	S_BOX[0] = 0x63;
	SI_BOX[0x63] = 0;
}

function getRijndaelSboxes()
{
	if (S_BOX.length === 0)
	{
		generateRijndaelSboxes();
	}

	return [S_BOX, SI_BOX];
}

function getRijndaelMulTable(multiplicand)
{
	if (!MUL3)
	{
		generateMulTables();
	}
	switch (multiplicand)
	{
		case 2: return MUL2;
		case 3: return MUL3;
		default:
			throw new Error(`Undefined Rijndael multiplication table: ${multiplicand}`);
	}
}

export {
	getRijndaelSboxes,
	getRijndaelMulTable
};