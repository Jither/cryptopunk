import { Signal } from "../jither.signals";

class Transform
{
	constructor()
	{
		this.warned = new Signal();

		Object.defineProperty(this, "options", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: {}
		});
		Object.defineProperty(this, "optionDefinitions", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: {}
		});
		Object.defineProperty(this, "defaults", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: {}
		});
		Object.defineProperty(this, "inputs", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
		Object.defineProperty(this, "inputNames", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
		Object.defineProperty(this, "outputs", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
		Object.defineProperty(this, "outputNames", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
		Object.defineProperty(this, "properties", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
		Object.defineProperty(this, "propertyNames", {
			enumerable: true,
			configurable: false,
			writable: false,
			value: []
		});
	}

	getTypeByValue(val)
	{
		if (typeof val === "number")
		{
			return "int";
		}
		else if (typeof val === "string")
		{
			return "string";
		}
		else if (typeof val === "boolean")
		{
			return "bool";
		}
		return null;
	}

	warn(message)
	{
		this.warned.dispatch(message);
	}

	addOption(name, caption, defaultValue, options)
	{
		options = options || {};
		this.optionDefinitions[name] = { caption, options, type: options.type || this.getTypeByValue(defaultValue) };
		this.defaults[name] = this.options[name] =  defaultValue;
		return this;
	}

	removeOption(name)
	{
		delete this.optionDefinitions[name];
		delete this.defaults[name];
		delete this.options[name];
		return this;
	}

	addInput(type, name)
	{
		this.inputs.push(type);
		this.inputNames.push(name || "Input #" + this.inputs.length);
		return this;
	}

	addOutput(type, name)
	{
		this.outputs.push(type);
		this.outputNames.push(name || "Output #" + this.outputs.length);
		return this;
	}

	addProperty(type, name)
	{
		this.properties.push(type);
		this.propertyNames.push(name || "Property #" + this.properties.length);
		return this;
	}
	
	setOptions(options)
	{
		for (const name in options)
		{
			if (!options.hasOwnProperty(name))
			{
				continue;
			}
			this.options[name] = options[name];
		}
	}

	setOption(name, value)
	{
		this.options[name] = value;
	}

	resetOptions()
	{
		for (const name in this.defaults)
		{
			if (!this.defaults.hasOwnProperty(name))
			{
				continue;
			}
			this.options[name] = this.defaults[name];
		}
	}
}

function TransformError(message)
{
	this.message = message;
	this.stack = (new Error()).stack;
}

TransformError.prototype = new Error();
TransformError.prototype.name = "TransformError";

export {
	Transform,
	TransformError
};