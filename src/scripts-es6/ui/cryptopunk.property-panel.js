import { bytesToHex } from "../cryptopunk.utils";

class PropertyPanel
{
	constructor(element)
	{
		this.element = element;
		this.eleOptionsContainer = element.querySelector(".option-properties");
		this.eleOutputsContainer = element.querySelector(".output-properties");
		this.eleNodeName = element.querySelector(".node-name");
		this.eleNodeTitle = element.querySelector(".node-title");
		this.eleOutputs = [];

		this.currentNode = null;

		this.nodeRemovedListener = this.nodeRemoved.bind(this);
		this.titleChangedListener = this.titleChanged.bind(this);

		this.eleNodeTitle.addEventListener("input", this.titleChangedListener);

		this.updateProperties(null);
	}

	updateLayout(node)
	{
		this.eleOptionsContainer.innerHTML = "";
		this.eleOutputsContainer.innerHTML = "";
		this.eleNodeTitle.innerHTML = "";

		const headers = this.element.querySelectorAll("h1");
		const divs = this.element.querySelectorAll(":scope > div");

		divs.forEach(div => { 
			div.style.display = node ? "block" : "none"; 
		});
		headers.forEach(header => {
			header.style.display = node ? "block" : "none";
		});
	}

	updateProperties(node)
	{
		if (this.currentNode)
		{
			this.currentNode.removed.remove(this.nodeRemovedListener);
		}

		this.updateLayout(node);

		this.currentNode = node;
		this.eleOutputs.length = 0;

		if (!node)
		{
			return;
		}

		this.eleNodeTitle.value = node.title;
		this.eleNodeName.innerText = node.name;

		node.removed.add(this.nodeRemovedListener);

		this.createOptions(node.controller);
		this.createOutputs(node.controller);
		this.updateOutputs(node);
	}

	createOptions(controller)
	{
		const changedCallback = function(name, value)
		{
			controller.options[name] = value;
			controller.update();
		};

		const optionDefinitions = controller.transform.optionDefinitions;

		if (optionDefinitions)
		{
			for (const name in optionDefinitions)
			{
				if (!optionDefinitions.hasOwnProperty(name))
				{
					continue;
				}
				this.eleOptionsContainer.appendChild(this.getEditorFor(name, optionDefinitions[name], controller.options[name], changedCallback));
			}
		}
	}

	createOutputs(controller)
	{
		const outputNames = controller.transform.outputNames;
		for (let i = 0; i < outputNames.length; i++)
		{
			const eleHeader = document.createElement("label");
			eleHeader.innerText = outputNames[i];
			this.eleOutputsContainer.appendChild(eleHeader);
			
			const eleOutput = document.createElement("textarea");
			eleOutput.readOnly = true;
			this.eleOutputsContainer.appendChild(eleOutput);

			this.eleOutputs.push(eleOutput);
		}
	}

	updateOutputs(node)
	{
		if (this.currentNode !== node)
		{
			return;
		}

		const outputs = this.currentNode.outputs;
		for (let i = 0; i < outputs.length; i++)
		{
			const value = outputs[i].value;
			if (typeof value === "string")
			{
				this.eleOutputs[i].value = value;
			}
			else
			{
				this.eleOutputs[i].value = bytesToHex(value);
			}
		}
	}

	applyFromOptions(element, option, attrName)
	{
		if (typeof option.options[attrName] !== "undefined")
		{
			element.setAttribute(attrName, option.options[attrName]);
		}
	}

	getEditorFor(name, option, value, changedCallback)
	{
		const eleEditor = document.createElement("div");
		const eleLabel = document.createElement("label");
		
		eleLabel.innerText = option.caption;
		eleEditor.appendChild(eleLabel);

		let eleInput;
		switch (option.type)
		{
			case "int":
				eleInput = document.createElement("input");
				eleInput.type = "number";
				eleInput.value = value;
				this.applyFromOptions(eleInput, option, "min");
				this.applyFromOptions(eleInput, option, "max");
				this.applyFromOptions(eleInput, option, "step");
				eleInput.addEventListener("input", () => changedCallback(name, parseInt(eleInput.value, 10)));
				break;
			case "char":
				eleInput = document.createElement("input");
				eleInput.type = "text";
				eleInput.value = value;
				eleInput.setAttribute("maxlength", 1);
				eleInput.addEventListener("input", () => changedCallback(name, eleInput.value));
				break;
			case "short-string":
				eleInput = document.createElement("input");
				eleInput.type = "text";
				eleInput.value = value;
				eleInput.addEventListener("input", () => changedCallback(name, eleInput.value));
				break;
			case "string":
				eleInput = document.createElement("textarea");
				eleInput.value = value;
				eleInput.addEventListener("input", () => changedCallback(name, eleInput.value));
				break;
			case "bool":
				eleInput = document.createElement("input");
				eleInput.checked = value;
				eleInput.addEventListener("change", () => changedCallback(name, eleInput.checked));
				eleInput.type = "checkbox";
				break;
			case "select":
				eleInput = document.createElement("select");
				const texts = option.options.texts;
				const values = option.options.values;
				for (let i = 0; i < texts.length; i++)
				{
					const eleOption = document.createElement("option");
					eleOption.innerText = texts[i];
					eleOption.value = i;
					eleInput.appendChild(eleOption);
				}
				eleInput.addEventListener("change", () => {
					const index = parseInt(eleInput.value, 10);
					const selected = values ? values[index] : texts[index];
					changedCallback(name, selected);
				});
				eleInput.value = values ? values.indexOf(value) : texts.indexOf(value);
				break;
		}
		eleInput.id = "prop-" + name;
		eleEditor.appendChild(eleInput);

		return eleEditor;
	}

	titleChanged()
	{
		if (this.currentNode)
		{
			this.currentNode.title = this.eleNodeTitle.value;
		}
	}

	nodeRemoved(node)
	{
		if (this.currentNode === node)
		{
			this.updateProperties(null);
		}
	}
}

export {
	PropertyPanel	
};