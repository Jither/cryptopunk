import { StreamCipherTransform } from "./stream-cipher";
import { parity32 } from "../../cryptopunk.bitarith";

const
	FRAME_MASK = 0b001111111111111111111111,

	R1_MASK    = 0b000001111111111111111111,
	R2_MASK    = 0b001111111111111111111111,
	R3_MASK    = 0b011111111111111111111111,

	R1_TAPS    = 0b000001110010000000000000,
	R2_TAPS    = 0b001100000000000000000000,
	R3_TAPS    = 0b011100000000000010000000,
	
	R1_CLOCK   = 0b000000000000000100000000,
	R2_CLOCK   = 0b000000000000010000000000,
	R3_CLOCK   = 0b000000000000010000000000,
	
	R1_OUT     = (R1_MASK + 1) >>> 1,
	R2_OUT     = (R2_MASK + 1) >>> 1,
	R3_OUT     = (R3_MASK + 1) >>> 1;

class A51Registers
{
	constructor(keyBytes, frameNo, reset228)
	{
		this.keyBytes = keyBytes;
		this.frameNo = frameNo & FRAME_MASK;

		this.reset228 = reset228;

		this.init();
	}

	init()
	{
		this.streamPosition = 0;
		
		this.r1 = 0;
		this.r2 = 0;
		this.r3 = 0;

		// Load key into registers
		for (let i = 0; i < 64; i++)
		{
			this.clockAll();
			const byteIndex = Math.floor(i / 8);
			const keybit = (this.keyBytes[byteIndex] >>> (i % 8)) & 1;
			this.r1 ^= keybit;
			this.r2 ^= keybit;
			this.r3 ^= keybit;
		}

		// Load frame number into registers. Note that only the low 22 bits will be used.
		for (let i = 0; i < 22; i++)
		{
			this.clockAll();
			const framebit = (this.frameNo >>> i) & 1;
			this.r1 ^= framebit;
			this.r2 ^= framebit;
			this.r3 ^= framebit;
		}

		// Warm up: Run shift registers for 100 clocks
		for (let i = 0; i < 100; i++)
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

	clock()
	{
		// Shift the registers whose clocking bit is in the majority of clocking bits:
		const r1Clocking = Boolean(this.r1 & R1_CLOCK);
		const r2Clocking = Boolean(this.r2 & R2_CLOCK);
		const r3Clocking = Boolean(this.r3 & R3_CLOCK);
		const majority = (r1Clocking + r2Clocking + r3Clocking) > 1;
		if (r1Clocking === majority)
		{
			this.r1 = this.clockRegister(this.r1, R1_MASK, R1_TAPS);
		}
		if (r2Clocking === majority)
		{
			this.r2 = this.clockRegister(this.r2, R2_MASK, R2_TAPS);
		}
		if (r3Clocking === majority)
		{
			this.r3 = this.clockRegister(this.r3, R3_MASK, R3_TAPS);
		}
	}

	clockAll()
	{
		this.r1 = this.clockRegister(this.r1, R1_MASK, R1_TAPS);
		this.r2 = this.clockRegister(this.r2, R2_MASK, R2_TAPS);
		this.r3 = this.clockRegister(this.r3, R3_MASK, R3_TAPS);
	}

	getBit()
	{
		this.clock();
		const result = Number(
			Boolean(this.r1 & R1_OUT) ^ 
			Boolean(this.r2 & R2_OUT) ^ 
			Boolean(this.r3 & R3_OUT)
		);

		this.streamPosition++;
		if (this.reset228 && this.streamPosition === 228)
		{
			this.frameNo = (this.frameNo + 1) & FRAME_MASK;
			this.init();
		}

		return result;
	}
}

class A51Transform extends StreamCipherTransform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addInput("bytes", "Key")
			.addInput("bytes", "Frame Number")
			.addOutput("bytes", "Output")
			.addOption("reset228", "Reset and increment frame number every 228 bits", true);
	}

	transform(bytes, keyBytes, frameNoBytes)
	{
		this.checkBytesSize("Key", keyBytes, 64);
		// Although we only use 22 bits, we can only require a whole number of bytes:
		this.checkBytesSize("Frame Number", frameNoBytes, 24);

		const frameNo = frameNoBytes[0] << 16 | frameNoBytes[1] << 8 | frameNoBytes[2];
		const regs = new A51Registers(keyBytes, frameNo, this.options.reset228);
		
		const output = new Uint8Array(bytes.length);
		for (let i = 0; i < bytes.length; i++)
		{
			let streamByte = 0;
			for (let j = 7; j >= 0; j--)
			{
				streamByte |= regs.getBit() << j;
			}
			output[i] = bytes[i] ^ streamByte;
		}

		return output;
	}
}

export {
	A51Transform
};