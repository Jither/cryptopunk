import { Signal } from "../jither.signals";
import { toVisualControlCodes } from "../cryptopunk.strings";
import { TransformError } from "../transforms/transforms";

class NodeController
{
	constructor(editor, name, transform, options)
	{
		this.node = editor.addNode(name);
		this.transform = transform;
		this.node.controller = this;
		this.options = Object.assign({}, transform.defaults);
		this.inputs = transform.inputs || [];
		this.outputs = transform.outputs || [];

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

		this.node.moveTo(options.x || 0, options.y || 0);

		this.node.inputValueChanged.add(this.inputValueChangedListener.bind(this));

		this.update();
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
		if (this.node.outputs.length > 0)
		{
			this.node.outputs[0].value = output;
		}
		if (errorMessage)
		{
			this.node.contentElement.innerText = errorMessage;
		}
		else
		{
			this.node.contentElement.innerText = typeof output === "string" ? toVisualControlCodes(output) : this.toHex(output);
		}

		this.nodeOutputChanged.dispatch(this.node);
	}

	inputValueChangedListener(/*socket, value*/)
	{
		this.update();
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