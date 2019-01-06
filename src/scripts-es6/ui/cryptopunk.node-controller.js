import { Signal } from "../jither.signals";
import { toVisualControlCodes } from "../cryptopunk.strings";
import { TransformError } from "../transforms/transforms";
import bigint from "../jither.bigint";

class NodeController
{
	constructor(editor, name, transform, options)
	{
		this.node = editor.addNode(name);
		this.transform = transform;
		this.transform.warned.add(this.nodeWarnedListener.bind(this));

		this.node.controller = this;
		this.options = Object.assign({}, transform.defaults);
		this.inputs = transform.inputs || [];
		this.outputs = transform.outputs || [];
		this.properties = transform.properties || [];

		this.nodeOutputChanged = new Signal();

		let index = 0;
		this.inputs.forEach(input => {
			this.node.addInput(transform.inputNames[index])
				.tags({ type: input })
				.acceptsConnection(this.acceptsConnection.bind(this));
			index++;
		});

		index = 0;
		this.outputs.forEach(output => {
			this.node.addOutput(transform.outputNames[index])
				.tags({ type: output })
				.acceptsConnection(this.acceptsConnection.bind(this));
			index++;
		});

		// TODO: For now, a single "property" is hardcoded: The transform itself
		index = 0;
		this.properties.forEach(prop => {
			const output = this.node.addOutput(transform.propertyNames[index])
				.tags({ type: prop })
				.acceptsConnection(this.acceptsConnection.bind(this));
			output.value = transform;
			index++;
		});

		this.node.moveTo(options.x || 0, options.y || 0);

		this.node.inputValueChanged.add(this.inputValueChangedListener.bind(this));

		this.update();
	}

	load(data)
	{
		Object.assign(this.options, data.options);
		this.update();
	}

	save()
	{
		return {
			// We can't use constructor.name - it's mangled when minimizing/uglifying
			// Instead, we use our own custom ID
			transform: this.transform.constructor.id,
			options: this.transform.options
		};
	}

	acceptsConnection(socket1, socket2)
	{
		return socket1.tags.type === socket2.tags.type;
	}

	inputsToArgs()
	{
		const args = [];
		let i = 0;
		this.inputs.forEach(input => {
			let value = this.node.inputs[i].value;
			if (value === null)
			{
				// Insert empty value rather than null
				switch (input)
				{
					case "string":
						value = "";
						break;
					case "bytes":
						value = new Uint8Array();
						// This is to ensure that transforms don't mutate the array
						// (For development/testing purposes)
						// Object.freeze(value);
						break;
					case "bigint":
						value = bigint(0);
						break;
				}
			}
			args.push(value);
			i++;
		});
		return args;
	}

	update()
	{
		const args = this.inputsToArgs();

		// TODO: Only apply options that actually changed
		this.transform.resetOptions();
		this.transform.setOptions(this.options);

		if (this.transform.transformAsync)
		{
			this.doTransformAsync(args);
		}
		else
		{
			this.doTransform(args);
		}
	}

	doTransform(args)
	{
		let output;
		let errorMessage = null;
		try
		{
			output = this.transform.transform(...args);
		}
		catch (e)
		{
			if (e instanceof TransformError)
			{
				errorMessage = e.message;
				output = null;
			}
			else
			{
				throw e;
			}
		}
		this.updateOutput(output, errorMessage);
	}

	doTransformAsync(args)
	{
		try
		{
			this.transform.transformAsync(...args)
				.then(output => {
					this.updateOutput(output);
				})
				.catch(e => {
					if (e instanceof TransformError)
					{
						this.updateOutput(null, e.message);
					}
					else
					{
						throw e;
					}
				});
		}
		catch (e)
		{
			if (e instanceof TransformError)
			{
				this.updateOutput(null, e.message);
			}
			else
			{
				throw e;
			}
		}
	}

	updateOutput(output, errorMessage)
	{
		this.node.error = !!errorMessage;
		this.node.value = output;

		if (Array.isArray(output))
		{
			for (let i = 0; i < output.length; i++)
			{
				this.node.outputs[i].value = output[i];
			}
		}
		else
		{
			this.node.outputs[0].value = output;
		}

		if (errorMessage)
		{
			this.node.contentElement.innerText = errorMessage;
		}
		else
		{
			if (output == null)
			{
				throw new Error("Node input received no value");
			}
			this.node.contentElement.innerText = this.getOutputString(this.outputs[0], this.node.outputs[0].value);
		}

		this.nodeOutputChanged.dispatch(this.node);
	}

	getOutputString(type, value)
	{
		switch (type)
		{
			case "string": return toVisualControlCodes(value);
			case "bytes": return this.toHex(value);
			default: return value.toString();
		}
	}

	inputValueChangedListener(/*socket, value*/)
	{
		this.update();
	}

	nodeWarnedListener(message)
	{
		// TODO: Proper warning handling (send to property panel, mark node with warning indicator...)
		console.warn(message); // eslint-disable-line no-console
	}

	toHex(bytes)
	{
		let result = "";
		for (let i = 0; i < bytes.length; i++)
		{
			if (i > 0)
			{
				result += " ";
			}

			result += ("0" + bytes[i].toString(16)).substr(-2);
		}
		return result;
	}
}

export {
	NodeController
};