import { StreamCipherTransform } from "./stream-cipher";
import { rol, mul64 } from "../../cryptopunk.bitarith";

const A = [0x4d34d34d, 0xd34d34d3, 0x34d34d34, 0x4d34d34d, 0xd34d34d3, 0x34d34d34, 0x4d34d34d, 0xd34d34d3];
const WORDSIZE = 0x100000000;

function reverseBytesToInt16sBE(bytes)
{
	const wordCount = bytes.length >> 1;
	const result = new Uint16Array(wordCount);
	let byteIndex = 0;
	for (let i = wordCount - 1; i >= 0; i--)
	{
		result[i] = (bytes[byteIndex++] << 8) | bytes[byteIndex++];
	}
	return result;
}

class RabbitTransform extends StreamCipherTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input");
		this.addInput("bytes", "Key");
		this.addInput("bytes", "IV");
		this.addOutput("bytes", "Output");
	}

	transform(bytes, keyBytes, ivBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);
		this.checkBytesSize("IV", ivBytes, [0, 64]);

		const state = this.setupState(keyBytes, ivBytes);

		const result = Uint8Array.from(bytes);
		const S = new Uint8Array(16);

		for (let startIndex = 0; startIndex < bytes.length; startIndex += 16)
		{
			this.updateCounters(state);
			this.nextState(state);
			this.extract(state.x, S);

			const endIndex = Math.min(startIndex + 16, bytes.length);
			let streamIndex = 0;
			for (let i = startIndex; i < endIndex; i++)
			{
				result[i] ^= S[streamIndex++];
			}
		}

		return result;
	}

	extract(x, S)
	{
		const s0 = (x[0] & 0xffff) ^ (x[5] >>> 16  );
		const s1 = (x[0] >>> 16  ) ^ (x[3] & 0xffff);
		const s2 = (x[2] & 0xffff) ^ (x[7] >>> 16  );
		const s3 = (x[2] >>> 16  ) ^ (x[5] & 0xffff);
		const s4 = (x[4] & 0xffff) ^ (x[1] >>> 16  );
		const s5 = (x[4] >>> 16  ) ^ (x[7] & 0xffff);
		const s6 = (x[6] & 0xffff) ^ (x[3] >>> 16  );
		const s7 = (x[6] >>> 16  ) ^ (x[1] & 0xffff);

		S[15] = s0 & 0xff;
		S[14] = s0 >> 8;
		S[13] = s1 & 0xff;
		S[12] = s1 >> 8;
		S[11] = s2 & 0xff;
		S[10] = s2 >> 8;
		S[ 9] = s3 & 0xff;
		S[ 8] = s3 >> 8;
		S[ 7] = s4 & 0xff;
		S[ 6] = s4 >> 8;
		S[ 5] = s5 & 0xff;
		S[ 4] = s5 >> 8;
		S[ 3] = s6 & 0xff;
		S[ 2] = s6 >> 8;
		S[ 1] = s7 & 0xff;
		S[ 0] = s7 >> 8;
	}

	g(u, v)
	{
		const uv = { lo: (u + v) & 0xffffffff, hi: 0 };
		const square = mul64(uv, uv);
		return square.lo ^ square.hi;
	}

	nextState(state)
	{
		const x = state.x;
		const G = state.G;
		const c = state.c;

		for (let j = 0; j < 8; j++)
		{
			G[j] = this.g(x[j], c[j]);
		}

		for (let j = 0; j < 8; j++)
		{
			const g0 = G[j];
			const g1 = G[(j + 7) % 8];
			const g2 = G[(j + 6) % 8];

			if ((j & 1) === 0)
			{
				x[j] = (g0 + rol(g1, 16) + rol(g2, 16)) & 0xffffffff;
			}
			else
			{
				x[j] = (g0 + rol(g1, 8) + g2) & 0xffffffff;
			}
		}
	}

	iterate(state, count)
	{
		for (let i = 0; i < count; i++)
		{
			this.updateCounters(state);
			this.nextState(state);
		}
	}

	updateCounters(state)
	{
		const c = state.c;
		for (let i = 0; i < 8; i++)
		{
			const temp = c[i] + A[i] + state.b;
			state.b = Math.floor(temp / WORDSIZE);
			c[i] = temp & 0xffffffff;
		}
	}

	setupState(keyBytes, ivBytes)
	{
		const KEYS = 8;
		const subKeys = reverseBytesToInt16sBE(keyBytes);

		const x = new Uint32Array(KEYS);
		const c = new Uint32Array(KEYS);

		for (let i = 0; i < KEYS; i++)
		{
			if (i & 1)
			{
				x[i] = subKeys[(i + 5) % KEYS] << 16 | subKeys[(i + 4) % KEYS];
				c[i] = subKeys[i] << 16 | subKeys[(i + 1) % KEYS];
			}
			else
			{
				x[i] = subKeys[(i + 1) % KEYS] << 16 | subKeys[i];
				c[i] = subKeys[(i + 4) % KEYS] << 16 | subKeys[(i + 5) % KEYS];
			}
		}

		const state = { x, c, b: 0, G: new Uint32Array(KEYS) };

		this.iterate(state, 4);

		for (let i = 0; i < KEYS; i++)
		{
			c[i] ^= x[(i + 4) % KEYS];
		}

		if (ivBytes.length > 0)
		{
			const ivWords = reverseBytesToInt16sBE(ivBytes);
			c[0] ^= ivWords[1] << 16 | ivWords[0];
			c[1] ^= ivWords[3] << 16 | ivWords[1];
			c[2] ^= ivWords[3] << 16 | ivWords[2];
			c[3] ^= ivWords[2] << 16 | ivWords[0];
			c[4] ^= ivWords[1] << 16 | ivWords[0];
			c[5] ^= ivWords[3] << 16 | ivWords[1];
			c[6] ^= ivWords[3] << 16 | ivWords[2];
			c[7] ^= ivWords[2] << 16 | ivWords[0];

			this.iterate(state, 4);
		}

		return state;
	}
}

export {
	RabbitTransform
};