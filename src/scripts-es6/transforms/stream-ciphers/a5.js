import { StreamCipherTransform } from "./stream-cipher";
import { parity32 } from "../../cryptopunk.bitarith";

const
	FRAME_MASK = 0b001111111111111111111111,

	R1_MASK    = 0b000001111111111111111111,
	R2_MASK    = 0b001111111111111111111111,
	R3_MASK    = 0b011111111111111111111111,
	R4_MASK    = 0b000000011111111111111111,

	R1_TAPS    = 0b000001110010000000000000,
	R2_TAPS    = 0b001100000000000000000000,
	R3_TAPS    = 0b011100000000000010000000,
	R4_TAPS    = 0b000000010000100000000000,
	
	R1_CLOCK   = 0b000000000000000100000000,
	R2_CLOCK   = 0b000000000000010000000000,
	R3_CLOCK   = 0b000000000000010000000000,

	R4_CLOCK1  = 0b000000000000010000000000,
	R4_CLOCK2  = 0b000000000000000000001000,
	R4_CLOCK3  = 0b000000000000000010000000,
	
	R1_LOADED  = 0b000000001000000000000000,
	R2_LOADED  = 0b000000010000000000000000,
	R3_LOADED  = 0b000001000000000000000000,
	R4_LOADED  = 0b000000000000010000000000,

	R1_OUT     = (R1_MASK + 1) >>> 1,
	R2_OUT     = (R2_MASK + 1) >>> 1,
	R3_OUT     = (R3_MASK + 1) >>> 1;

function majority(a, b, c)
{
	a = Boolean(a);
	b = Boolean(b);
	c = Boolean(c);
	const majorityBit = a + b + c > 1;
	return {
		majority: majorityBit,
		a: a === majorityBit,
		b: b === majorityBit,
		c: c === majorityBit,
	};
}

class A5Registers
{
	constructor(version)
	{
		this.version = version;
		this.clock = version === 2 ? this.clock2 : this.clock1;
	}

	setup(keyBytes, frameNo, resetAfterFrame)
	{
		this.keyBytes = keyBytes;
		this.frameNo = frameNo & FRAME_MASK;

		this.resetAfterFrame = resetAfterFrame;

		this.init();
	}

	init()
	{
		this.streamPosition = 0;
		
		this.r1 = 0;
		this.r2 = 0;
		this.r3 = 0;
		this.r4 = 0; // Not used for A5/1

		// Load key into registers
		for (let i = 0; i < 64; i++)
		{
			this.clockAll();
			const byteIndex = Math.floor(i / 8);
			const keybit = (this.keyBytes[byteIndex] >>> (i % 8)) & 1;
			this.r1 ^= keybit;
			this.r2 ^= keybit;
			this.r3 ^= keybit;
			this.r4 ^= keybit;
		}

		// Load frame number into registers. Note that only the low 22 bits will be used.
		for (let i = 0; i < 22; i++)
		{
			this.clockAll();
			const framebit = (this.frameNo >>> i) & 1;
			this.r1 ^= framebit;
			this.r2 ^= framebit;
			this.r3 ^= framebit;
			this.r4 ^= framebit;
		}

		if (this.version === 2)
		{
			this.r1 |= R1_LOADED;
			this.r2 |= R2_LOADED;
			this.r3 |= R3_LOADED;
			this.r4 |= R4_LOADED;
		}

		// Warm up: Run shift registers for 100 clocks (99 for A5/2)
		const discard = this.version === 2 ? 99 : 100;
		for (let i = 0; i < discard; i++)
		{
			this.clock();
		}
	}    

	clockRegister(r, mask, taps)
	{
		const t = r & taps;
		r = (r << 1) & mask;
		r |= parity32(t);
		return r;
	}

	_clock(r1Clocking, r2Clocking, r3Clocking)
	{
		// Shift the registers whose clocking bit is in the majority of clocking bits:
		const maj = majority(r1Clocking, r2Clocking, r3Clocking);
		if (maj.a)
		{
			this.r1 = this.clockRegister(this.r1, R1_MASK, R1_TAPS);
		}
		if (maj.b)
		{
			this.r2 = this.clockRegister(this.r2, R2_MASK, R2_TAPS);
		}
		if (maj.c)
		{
			this.r3 = this.clockRegister(this.r3, R3_MASK, R3_TAPS);
		}
	}

	clock1()
	{
		// For A5/1, each register has a clocking bit:
		const r1Clocking = this.r1 & R1_CLOCK;
		const r2Clocking = this.r2 & R2_CLOCK;
		const r3Clocking = this.r3 & R3_CLOCK;
		this._clock(r1Clocking, r2Clocking, r3Clocking);
	}

	clock2()
	{
		// For A5/2, the clocking bits for R1-R3 are in R4
		const r1Clocking = this.r4 & R4_CLOCK1;
		const r2Clocking = this.r4 & R4_CLOCK2;
		const r3Clocking = this.r4 & R4_CLOCK3;
		this._clock(r1Clocking, r2Clocking, r3Clocking);

		this.r4 = this.clockRegister(this.r4, R4_MASK, R4_TAPS);
	}

	clockAll()
	{
		this.r1 = this.clockRegister(this.r1, R1_MASK, R1_TAPS);
		this.r2 = this.clockRegister(this.r2, R2_MASK, R2_TAPS);
		this.r3 = this.clockRegister(this.r3, R3_MASK, R3_TAPS);
		this.r4 = this.clockRegister(this.r4, R4_MASK, R4_TAPS);
	}

	getBit()
	{
		this.clock();
		const
			r1 = this.r1,
			r2 = this.r2,
			r3 = this.r3;

		let result = 
			Boolean(r1 & R1_OUT) ^ 
			Boolean(r2 & R2_OUT) ^ 
			Boolean(r3 & R3_OUT);

		if (this.version === 2)
		{
			result ^= majority(r1 & 0x8000, (~r1) & 0x4000, r1 & 0x1000).majority ^
				majority((~r2) & 0x10000, r2 & 0x2000, r2 & 0x200).majority ^
				majority(r3 & 0x40000, r3 & 0x10000, ~(r3) & 0x2000).majority;
		}

		this.streamPosition++;
		if (this.streamPosition === 228)
		{
			if (this.resetAfterFrame)
			{
				this.frameNo = (this.frameNo + 1) & FRAME_MASK;
				this.init();
			}
			this.streamPosition = 0;
		}

		return result;
	}
}

class A5Transform extends StreamCipherTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addInput("bytes", "Key")
			.addInput("bytes", "Frame Number")
			.addOutput("bytes", "Output")
			.addOption("byteAlign", "Align segments to bytes", true)
			.addOption("resetAfterFrame", "Reset/increment after each frame", true);
	}

	transform(bytes, keyBytes, frameNoBytes)
	{
		this.checkBytesSize("Key", keyBytes, 64);
		// Although we only use 22 bits, we can only require a whole number of bytes:
		this.checkBytesSize("Frame Number", frameNoBytes, 24);

		const frameNo = frameNoBytes[0] << 16 | frameNoBytes[1] << 8 | frameNoBytes[2];
		const regs = this.registers;
		regs.setup(keyBytes, frameNo, this.options.resetAfterFrame);
		
		const output = new Uint8Array(bytes.length);
		let outputIndex = 0;
		for (let i = 0; i < bytes.length; i++)
		{
			let streamByte = 0;
			// If we're aligning to bytes, only read 2 bits for every 15th byte:
			const endBit = (this.options.byteAlign && ((i + 1) % 15 === 0)) ? 6 : 0;
			for (let j = 7; j >= endBit; j--)
			{
				streamByte |= regs.getBit() << j;
			}
			output[outputIndex++] = bytes[i] ^ streamByte;
		}

		return output;
	}
}

class A51Transform extends A5Transform
{
	constructor()
	{
		super();
		this.registers = new A5Registers(1);
	}
}

class A52Transform extends A5Transform
{
	constructor()
	{
		super();
		this.registers = new A5Registers(2);
	}
}

export {
	A51Transform,
	A52Transform
};