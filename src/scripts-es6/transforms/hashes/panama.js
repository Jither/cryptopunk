import { HashTransform } from "./hash";
import { rol } from "../../cryptopunk.bitarith";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { mod } from "../../cryptopunk.math";

const STAGE_SIZE = 8;
const STAGES = 32;
const STATE_SIZE = 17;

function gamma(context)
{
	const g = context.gamma,
		state = context.state;
	for (let i = 0; i < STATE_SIZE; i++)
	{
		g[i] = state[i] ^ (state[(i + 1) % STATE_SIZE] | ~state[(i + 2) % STATE_SIZE]);
	}
}

function pi(context)
{
	const p = context.pi,
		g = context.gamma;

	let shift = 0;
	for (let i = 0; i < STATE_SIZE; i++)
	{
		shift += i;
		p[i] = rol(g[(i * 7) % STATE_SIZE], shift % 32);
	}
}

function theta(context)
{
	const t = context.theta,
		p = context.pi;

	for (let i = 0; i < STATE_SIZE; i++)
	{
		t[i] = p[i] ^ p[(i + 1) % STATE_SIZE] ^ p[(i + 4) % STATE_SIZE];
	}
}

function sigma(context)
{
	const state = context.state,
		t = context.theta,
		L = context.L,
		B = context.B;

	state[0] = t[0] ^ 1;

	for (let i = 0; i < STAGE_SIZE; i++)
	{
		state[i + 1] = t[i + 1] ^ L[i];
		state[i + 9] = t[i + 9] ^ B[i];
	}
}

function lambdaPush(context, tap0index, tap25index)
{
	const tap0 = context.buffer[tap0index],
		tap25 = context.buffer[tap25index],
		L = context.L;

	for (let i = 0; i < STAGE_SIZE; i++)
	{
		tap25[i] ^= tap0[(i + 2) % STAGE_SIZE];
	}
	for (let i = 0; i < STAGE_SIZE; i++)
	{
		tap0[i] ^= L[i];
	}
}

function lambdaPull(context, tap0index, tap25index)
{
	const tap0 = context.buffer[tap0index],
		tap25 = context.buffer[tap25index],
		state = context.state;

	for (let i = 0; i < STAGE_SIZE; i++)
	{
		tap25[i] ^= tap0[(i + 2) % STAGE_SIZE];
	}

	for (let i = 0; i < STAGE_SIZE; i++)
	{
		tap0[i] ^= state[i + 1];
	}
}

class PanamaHashTransform extends HashTransform
{
	constructor()
	{
		super();

		this.paddingStartBit = 0x01;
	}

	transform(bytes)
	{
		const context = this.init();
		this.reset(context);
		this.transformBlocks(bytes, 32, context);
		this.pull(context, 32, true);
		const result = this.pull(context, 1, false);
		return int32sToBytesLE(result);
	}

	transformBlock(block, context)
	{
		this.push(block, context);
	}

	push(block, context)
	{
		let tap0 = context.tap0;

		gamma(context);
		pi(context);
		theta(context);

		context.L = bytesToInt32sLE(block);
		context.B = context.buffer[(tap0 + 16) % STAGES];
		tap0 = mod(tap0 - 1, STAGES);
		const tap25 = (tap0 + 25) % STAGES;

		lambdaPush(context, tap0, tap25);

		sigma(context);

		context.tap0 = tap0;
	}

	pull(context, count, skip)
	{
		let tap0 = context.tap0;

		let result = null;
		if (!skip)
		{
			result = new Array(8);
		}

		for (let i = 0; i < count; i++)
		{
			if (!skip)
			{
				const state = context.state;
				for (let s = 0; s < 8; s++)
				{
					result[s] = state[s + 9];
				}
			}

			gamma(context);
			pi(context);
			theta(context);

			context.L = context.buffer[(tap0 + 4) % STAGES];
			context.B = context.buffer[(tap0 + 16) % STAGES];

			tap0 = mod(tap0 - 1, STAGES);
			const tap25 = (tap0 + 25) % STAGES;
			
			lambdaPull(context, tap0, tap25);

			sigma(context);
		}
		context.tap0 = tap0;
		return result;
	}

	init()
	{
		const context = {
			state: new Array(STATE_SIZE),
			buffer: new Array(STAGES),
			gamma: new Array(STATE_SIZE),
			pi: new Array(STATE_SIZE),
			theta: new Array(STATE_SIZE)
		};

		for (let i = 0; i < STAGES; i++)
		{
			context.buffer[i] = new Array(STAGE_SIZE);
		}
		return context;
	}

	reset(context)
	{
		context.tap0 = 0;
		const buffer = context.buffer;
		for (let i = 0; i < buffer.length; i++)
		{
			const stage = buffer[i];
			for (let j = 0; j < STAGE_SIZE; j++)
			{
				stage[j] = 0;
			}
		}
		for (let i = 0; i < STATE_SIZE; i++)
		{
			context.state[i] = 0;
		}
	}
}

export {
	PanamaHashTransform
};