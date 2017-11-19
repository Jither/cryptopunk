const MUL2 = []; // Map of a -> a*{02} in Rijndael field
const MUL3 = []; // Map of a -> a*{03} in Rijndael field
const INV3 = []; // Map of a*{03} -> a in Rijndael field

const S_BOX = [];
const SI_BOX = [];

function generateMulTables()
{
	for (let x = 0; x < 256; x++)
	{
		let x2 = x << 1;
		if (x2 & 0x100)
		{
			// 0x11b = Rijndael polynomial (x^8 + x^4 + x^3 + x + 1 = {100011011} = {0x11b})
			x2 ^= 0x11b;
		}
		const x3 = x2 ^ x;
		MUL2[x] = x2;
		MUL3[x] = x3;
		INV3[x3] = x;
	}
}

function generateRijndaelSboxes()
{
	if (MUL3.length === 0)
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