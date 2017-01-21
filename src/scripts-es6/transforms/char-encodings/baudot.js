import { Transform, TransformError } from "../transforms";

const BAUDOT_CONTINENTAL = {
	"A": 0b10000,
	"B": 0b00110,
	"C": 0b10110,
	"D": 0b11110,
	"E": 0b01000,
	"F": 0b01110,
	"G": 0b01010,
	"H": 0b11010,
	"I": 0b01100,
	"J": 0b10010,
	"K": 0b10011,
	"L": 0b11011,
	"M": 0b01011,
	"N": 0b01111,
	"O": 0b11100,
	"P": 0b11111,
	"Q": 0b10111,
	"R": 0b00111,
	"S": 0b00101,
	"T": 0b10101,
	"U": 0b10100,
	"V": 0b11110,
	"W": 0b01101,
	"X": 0b01001,
	"Y": 0b00100,
	"Z": 0b11001,
	"\x08": 0b00011,
	"FIG": 0b00010,
	"LET": 0b00001,
	"É": 0b11000,
	"_t_": 0b10001
};

class BaudotToBytesTransform extends Transform
{
	constructor()
	{
		super();
	}
}

class BytesToBaudotTransform extends Transform
{
	constructor()
	{
		super();
	}
}

export {
	BaudotToBytesTransform,
	BytesToBaudotTransform
};