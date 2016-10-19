class Transform
{
	constructor()
	{
		Object.defineProperty(this, "options", {
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

	addOption(name, caption, defaultValue, options)
	{
		options = options || {};
		this.options[name] = { caption, options, type: options.type || this.getTypeByValue(defaultValue) };
		this.defaults[name] = defaultValue;
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

	setDefault(name, defaultValue)
	{
		this.defaults[name] = defaultValue;
		return this;
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