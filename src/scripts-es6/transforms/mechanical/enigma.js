import { Transform, TransformError } from "../transforms";
import { mod } from "../../cryptopunk.utils";

const ROTOR_NAMES = ["None", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "β", "γ"];
const ROTOR_VALUES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "beta", "gamma"];

const REFLECTOR_NAMES = ["A", "B", "C", "B Thin", "C Thin"];

// Converts letter based wiring definition to numeric left/right shifts for forward and backward "signal".
// This makes it easier to rotate the wiring inside the rotors to new letter positions (which is what the
// ring settings do).
function makeWiring(str)
{
	const result = {
		forward: [],
		backward: new Array(str.length)
	};
	for (let from = 0; from < str.length; from++)
	{
		const to = str.charCodeAt(from) - 65;
		const diff = to - from;
		result.forward.push(diff);
		result.backward[to] = -diff;
	}
	return result;
}

// Rotor setups.
// - Wiring indicates the wiring when ring setting is in "A" position: For each letter from
//   A-Z, what letter does the rotor convert to when the signal goes forwards through it?
//   makeWiring converts this conventional notation to numeric shifts. See above.
// - Notches indicate the position that will cause any rotor on the left to take a step on the
//   next letter entry.
// Note that wiring changes by ring setting doesn't affect the position of the notches.
const ROTORS = {
	"I"		: { wiring: makeWiring("EKMFLGDQVZNTOWYHXUSPAIBRCJ"), notches: "Q" },
	"II"	: { wiring: makeWiring("AJDKSIRUXBLHWTMCQGZNPYFVOE"), notches: "E" },
	"III"	: { wiring: makeWiring("BDFHJLCPRTXVZNYEIWGAKMUSQO"), notches: "V" },
	"IV"	: { wiring: makeWiring("ESOVPZJAYQUIRHXLNFTGKDCMWB"), notches: "J" },
	"V"		: { wiring: makeWiring("VZBRGITYUPSDNHLXAWMJQOFECK"), notches: "Z" },
	"VI"	: { wiring: makeWiring("JPGVOUMFYQBENHZRDKASXLICTW"), notches: "ZM" },
	"VII"	: { wiring: makeWiring("NZJHGRCXMYSWBOUFAIVLPEKQDT"), notches: "ZM" },
	"VIII"	: { wiring: makeWiring("FKQHTLXOCBJSPDZRAMEWNIUYGV"), notches: "ZM" },
	"beta"	: { wiring: makeWiring("LEYJVCNIXWPBQMDRTAKZGFUHOS"), notches: "", fixed: true }, // Zusatzwalze - doesn't move - or move anything else
	"gamma"	: { wiring: makeWiring("FSOKANUERHMBTIYCWLQPZXVGJD"), notches: "", fixed: true }
};

// Reflector setups.
// Like for rotors, wiring indices for each letter, A-Z, what letter the reflector converts
// to. Unlike rotors, reflectors never rotate during encryption/decryption (and in most
// setups cannot be rotated as a setting)
const REFLECTORS = {
	"A"		: { wiring: "EJMZALYXVBWFCRQUONTSPIKHGD" },
	"B"		: { wiring: "YRUHQSLDPXNGOKMIEBFZCWVJAT" },
	"C"		: { wiring: "FVPJIAOYEDRZXWGCTKUQSBNMHL" },
	"B Thin": { wiring: "ENKQAUYWJICOPBLMDXZVFTHRGS" },
	"C Thin": { wiring: "RDOBJNTKVEHMLFCWZAXGYIPSUQ" }
};

const BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/*
function logTransform(name, input, output, base)
{
	base = base || BASE;
	console.log(`${name}: ${base.charAt(input)} -> ${base.charAt(output)}`);
}
*/

class EnigmaRotor
{
	constructor(setup, position, ringSetting)
	{
		this.base = BASE;
		this.wiring = setup.wiring;
		this.notches = setup.notches;
		this.fixed = setup.fixed;
		this.wiringOffset = ringSetting - 1;
		this.position = 0;
		this.rotate(position);
	}

	// Returns information on current configuration for textual output
	get configuration()
	{
		let resultIn = "";
		let resultOut = "";
		for (let i = 0; i < this.base.length; i++)
		{
			resultIn += this.base.charAt(i);
			resultOut += this.base.charAt(this.forward(i));
		}
		return resultIn + "\n" + resultOut + "\n";
	}

	// Returns current "base letter" (the letter that would display in the rotor window on an actual
	// Enigma machine)
	get currentBase()
	{
		return this.base.charAt(this.position);
	}

	// Some of the forward/backward transforms could obviously be optimized out - but are kept for
	// debugging purposes for now.

	forward(input)
	{
		// First transform input to "local" value based on current position of rotor
		input = (input + this.position) % BASE.length;
		// Find the wire that the input signal will go through
		const inputWire = mod(input - this.wiringOffset, BASE.length);
		// Transform input based on wiring
		let output = mod(input + this.wiring.forward[inputWire], BASE.length);
		
		//logTransform("RF", input, output);
		
		// Finally transform input back to "world" value before outputting
		output = mod(output - this.position, BASE.length);
		return output;
	}

	backward(input)
	{
		// First transform input to "local" value based on current position of rotor
		input = (input + this.position) % BASE.length;
		// Find the wire that the input signal will go through
		const inputWire = mod(input - this.wiringOffset, BASE.length);
		// Transform input based on wiring
		let output = mod(input + this.wiring.backward[inputWire], BASE.length);

		//logTransform("RB", input, output);

		// Finally transform input back to "world" value before outputting
		output = mod(output - this.position, BASE.length);
		return output;
	}

	rotate(rotation)
	{
		// Note that this method is also used internally for moving into initial position
		// Therefore, we allow even "fixed" rotors (the "zusatzwalze") to rotate
		if (typeof rotation === "undefined")
		{
			rotation = 1;
		}
		this.position = (this.position + rotation) % BASE.length;

		// Mark this rotor as "notched" if it's at a notch position.
		this.notched = this.notches.indexOf(this.currentBase) >= 0;
	}
}

class EnigmaReflector
{
	constructor(setup)
	{
		this.wiring = setup.wiring;
	}

	// The reflector only handles a forward signal - it's what sends the signal back(wards)
	forward(input)
	{
		const output = this.wiring.indexOf(BASE.charAt(input));
		//logTransform("R ", input, output);
		return output;
	}

	// Returns information on current configuration for textual output
	get configuration()
	{
		let resultIn = "";
		let resultOut = "";
		for (let i = 0; i < this.wiring.length; i++)
		{
			resultIn += BASE.charAt(i);
			resultOut += this.wiring.charAt(i);
		}
		return resultIn + "\n" + resultOut + "\n";
	}
}

class EnigmaPlugboard
{
	constructor(pairs)
	{
		this.connections = {};
		for (let i = 0; i < pairs.length; i++)
		{
			const pair = pairs[i];

			// Plug setup must be an upper case letter pair
			if (!/^[A-Z]{2,}$/.test(pair))
			{
				throw new TransformError(`Invalid plug pair: ${pair}`);
			}
			
			const strFrom = pair.charAt(0);
			const strTo = pair.charAt(1);
			// Map plugs in both directions, so that we can look up plugs at
			// both ends of the wire:
			this.connections[BASE.indexOf(strFrom)] = BASE.indexOf(strTo);
			this.connections[BASE.indexOf(strTo)] = BASE.indexOf(strFrom);
		}
	}

	// Returns information on current configuration for textual output
	get configuration()
	{
		let resultIn = "";
		let resultOut = "";
		for (const index in this.connections)
		{
			if (!this.connections.hasOwnProperty(index))
			{
				continue;
			}

			resultIn += BASE.charAt(index);
			resultOut += BASE.charAt(this.connections[index]);
		}
		return resultIn + "\n" + resultOut + "\n";
	}

	forward(input)
	{
		// Simple remap of input to output
		let output = this.connections[input];
		if (typeof output === "undefined")
		{
			// If no plug here, then output is the same as input
			output = input;
		}

		//logTransform("P ", input, output);
		
		return output;
	}

	backward(input)
	{
		// Since we've mapped plugs in both directions, backward is the same as forward
		return this.forward(input);
	}
}

class EnigmaMachine
{
	constructor(rotors, rotorPositions, ringSettings, reflector, plugPairs)
	{
		this.rotors = [];

		// For coding convenience, rotors are stored in opposite order - right to left - because
		// the signal enters last (rightmost) rotor first
		for (let i = rotors.length - 1; i >= 0; i--)
		{
			const rotorPosition = rotorPositions[i];
			if (typeof rotorPosition === "undefined")
			{
				throw new TransformError(`Missing rotor position for rotor ${i + 1}`);
			}

			const ringSetting = ringSettings[i];
			if (typeof ringSetting === "undefined")
			{
				throw new TransformError(`Missing ring setting for rotor ${i + 1}`);
			}

			const rotorSetup = ROTORS[rotors[i]];
			if (!rotorSetup)
			{
				throw new TransformError(`Unknown rotor: ${rotors[i]}`);
			}

			// Create and add rotor:
			this.rotors.push(new EnigmaRotor(ROTORS[rotors[i]], rotorPosition, ringSetting));
		}

		if (this.rotors.length === 0)
		{
			throw new TransformError("At least one rotor needs to be inserted.");
		}

		const reflectorSetup = REFLECTORS[reflector];
		if (!reflectorSetup)
		{
			throw new TransformError(`Unknown reflector: ${reflector}`);
		}

		this.reflector = new EnigmaReflector(reflectorSetup);
		this.plugboard = new EnigmaPlugboard(plugPairs);
	}

	// Returns information on current configuration for textual output
	get configuration()
	{
		let result = "";

		result += "Plugboard:\n";
		result += this.plugboard.configuration + "\n";

		let rotorIndex = 0;
		this.rotors.forEach(rotor => {
			result += `Rotor ${rotorIndex}:\n`;
			result += rotor.configuration + "\n";
			rotorIndex++;
		});

		result += "Reflector:\n";
		result += this.reflector.configuration + "\n";

		return result;
	}

	// Actual transformation of a single letter
	transform(letter)
	{
		// Rotate rotors. Rotation occurs after "keypress", but BEFORE transform

		// First we rotate the left rotors if right rotor notched them:
		for (let i = this.rotors.length - 1; i > 0; i--)
		{
			const rotor = this.rotors[i];

			const rotorRight = this.rotors[i - 1];
			if (rotorRight.notched)
			{
				rotorRight.notched = false;

				// "zusatzwalze" stays fixed
				if (rotor.fixed)
				{
					continue;
				}

				rotor.rotate();
				// The infamous double step! If the rotor to the right caused this rotor to step, 
				// the rotor to the right will also step (once more)
				if (i > 1)
				{
					rotorRight.rotate();
				}
			}
		}

		// Then we rotate the right-most rotor
		this.rotors[0].rotate();

		// Now the signal (letter) is sent through the transform circuit:
		letter = letter.toUpperCase();

		let index = BASE.indexOf(letter);

		// 1) through plugboard:
		index = this.plugboard.forward(index);

		// 2) through rotors:
		for (let i = 0; i < this.rotors.length; i++)
		{
			index = this.rotors[i].forward(index);
		}

		// 3) through reflector:
		index = this.reflector.forward(index);

		// 4) back through rotors in opposite direction:
		for (let i = this.rotors.length - 1; i >= 0; i--)
		{
			index = this.rotors[i].backward(index);
		}

		// 5) back through plugboard:
		index = this.plugboard.backward(index);

		return BASE.charAt(index);
	}
}

// This Transform class is really just a factory and wrapper for the EnigmaMachine class,
// which does all the real work
class EnigmaTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Input")
			.addOutput("string", "Output")
			.addOption("rotor0", "Rotor 1", "I", { type: "select", texts: ROTOR_NAMES, values: ROTOR_VALUES })
			.addOption("rotor1", "Rotor 2", "II", { type: "select", texts: ROTOR_NAMES, values: ROTOR_VALUES })
			.addOption("rotor2", "Rotor 3", "III", { type: "select", texts: ROTOR_NAMES, values: ROTOR_VALUES })
			.addOption("rotor3", "Rotor 4", "", { type: "select", texts: ROTOR_NAMES, values: ROTOR_VALUES })
			.addOption("reflector", "Reflector", "A", { type: "select", texts: REFLECTOR_NAMES })
			.addOption("ringSettings", "Ring Settings", "1,1,1", { type: "short-string" })
			.addOption("rotorPositions", "Rotor Positions", "A,A,A", { type: "short-string"})
			.addOption("plugPairs", "Plug Pairs", "", { type: "short-string" });

	}

	// Enigma machine factory. TODO: Cache
	createMachine(options)
	{
		const rotorNames = [];
		const rotorPositions = [];
		const ringSettings = [];
		const plugPairs = [];

		// Parse rotor positions into something usable by EnigmaMachine class
		const arrRotorPositions = options.rotorPositions.split(/[\s,]/);
		for (let i = 0; i < arrRotorPositions.length; i++)
		{
			const strRotorPosition = arrRotorPositions[i].trim().toUpperCase();
			if (strRotorPosition === "")
			{
				continue;
			}
			if (!/^[A-Z]$/.test(strRotorPosition))
			{
				throw new TransformError(`Invalid rotor position: ${strRotorPosition}`);
			}
			const rotorPosition = strRotorPosition.charCodeAt(0) - 65;
			rotorPositions.push(rotorPosition);
		}

		// Parse ring settings into something usable by EnigmaMachine class
		const arrRingSettings = options.ringSettings.split(/[\s,]/);
		for (let i = 0; i < arrRingSettings.length; i++)
		{
			const strRingSetting = arrRingSettings[i].trim().toUpperCase();
			if (strRingSetting === "")
			{
				continue;
			}
			let ringSetting = parseInt(strRingSetting, 10);
			if (isNaN(ringSetting))
			{
				if (/^[A-Z]$/.test(strRingSetting))
				{
					ringSetting = BASE.indexOf(strRingSetting) + 1;
				}
				else
				{
					throw new TransformError(`Invalid ring setting: ${strRingSetting}`);
				}
			}
			if (ringSetting < 1 || ringSetting > BASE.length)
			{
				throw new TransformError(`Ring settings out of range 1-26 (A-Z). Was ${strRingSetting}`);
			}
			ringSettings.push(ringSetting);
		}

		// Parse plug pairs into something usable by EnigmaMachine class
		const arrPlugPairs = options.plugPairs.split(/[\s,]/);
		for (let i = 0; i < arrPlugPairs.length; i++)
		{
			const strPlugPair = arrPlugPairs[i].trim().toUpperCase();
			if (strPlugPair === "")
			{
				continue;
			}
			plugPairs.push(strPlugPair);
		}

		for (let i = 0; i < 4; i++)
		{
			const rotorName = options["rotor" + i];
			if (rotorName)
			{
				rotorNames.push(rotorName);
			}
		}
		return new EnigmaMachine(rotorNames, rotorPositions, ringSettings, options.reflector, plugPairs);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		let result = "";

		const machine = this.createMachine(options);

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);

			// If we don't have a letter (i.e. something the machine can encrypt), just output as is:
			if (!/[a-zA-Z]/.test(c))
			{
				result += c;
				continue;
			}

			// Add a transformed letter to the result string:
			result += machine.transform(c);
		}
		return result;
	}
}

export {
	EnigmaTransform
};