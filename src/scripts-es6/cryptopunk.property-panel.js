import { bytesToHex } from "./cryptopunk.utils";

const eleProperties = document.getElementById("properties");
const elePropContainer = document.getElementById("property-list");
const eleOutputsContainer = document.getElementById("output-list");
const eleOutputs = [];

let currentNode;

function getPropertyEditorFor(name, option, value, changedCallback)
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
			eleInput.addEventListener("input", () => changedCallback(name, parseInt(eleInput.value, 10)));
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
			const values = option.options.values;
			for (const text in values)
			{
				if (!values.hasOwnProperty(text))
				{
					continue;
				}
				const eleOption = document.createElement("option");
				eleOption.innerText = text;
				eleOption.value = values[text];
				eleInput.appendChild(eleOption);
			}
			eleInput.addEventListener("change", () => changedCallback(name, eleInput.value));
			eleInput.value = value;
			break;
	}
	eleInput.id = "prop-" + name;
	eleEditor.appendChild(eleInput);

	return eleEditor;
}

function showProperties(node)
{
	if (currentNode)
	{
		currentNode.removed.remove(nodeRemovedListener);
	}

	eleOutputs.length = 0;

	elePropContainer.innerHTML = "";
	eleOutputsContainer.innerHTML = "";

	const headers = eleProperties.querySelectorAll("h1");
	const eleNode = headers[0].querySelector("span");
	headers.forEach(header => { header.style.display = node ? "block" : "none"; });

	currentNode = node;

	if (!node)
	{
		return;
	}

	eleNode.innerText = node.name;

	const controller = node.controller;

	const optionDefinitions = controller.transform.options;

	node.removed.add(nodeRemovedListener);

	const changedCallback = function(name, value)
	{
		controller.options[name] = value;
		controller.update();
	};

	if (optionDefinitions)
	{
		for (const name in optionDefinitions)
		{
			if (!optionDefinitions.hasOwnProperty(name))
			{
				continue;
			}
			elePropContainer.appendChild(getPropertyEditorFor(name, optionDefinitions[name], controller.options[name], changedCallback));
		}
	}

	const outputNames = controller.transform.outputNames;
	for (let i = 0; i < outputNames.length; i++)
	{
		const eleHeader = document.createElement("label");
		eleHeader.innerText = outputNames[i];
		eleOutputsContainer.appendChild(eleHeader);
		
		const eleOutput = document.createElement("textarea");
		eleOutput.readOnly = true;
		eleOutputsContainer.appendChild(eleOutput);

		eleOutputs.push(eleOutput);
	}

	updateOutputs(currentNode);
}

function nodeRemovedListener(node)
{
	if (currentNode === node)
	{
		showProperties(null);
	}
}

function updateOutputs(node)
{
	if (currentNode !== node)
	{
		return;
	}

	const outputs = currentNode.outputs;
	for (let i = 0; i < outputs.length; i++)
	{
		const value = outputs[i].value;
		if (typeof value === "string")
		{
			eleOutputs[i].value = value;
		}
		else
		{
			eleOutputs[i].value = bytesToHex(value);
		}
	}
}

export {
	showProperties,
	updateOutputs
};