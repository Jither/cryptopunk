import { Signal } from "../jither.signals";

const INPUT = "input", OUTPUT = "output";

function NodeEditorError(message)
{
	this.message = message;
	this.stack = (new Error()).stack;
}

NodeEditorError.prototype = new Error();
NodeEditorError.prototype.name = "NodeEditorError";

function getOffset(element, coordSpace)
{
	const result = {
		top: element.offsetTop,
		left: element.offsetLeft
	};

	let parent = element.offsetParent;
	while (parent && parent !== coordSpace)
	{
		result.top += parent.offsetTop;
		result.left += parent.offsetLeft;

		parent = parent.offsetParent;
	}

	return result;
}

function createPathStr(a, b, nodeA, nodeB)
{
	const distX = b.x - a.x;
	//const distY = b.y - a.y;
	if (distX > 0)
	{
		return `M${a.x},${a.y} C${a.x + distX / 3 * 2},${a.y} ${a.x + distX / 3},${b.y} ${b.x},${b.y}`;
	}
	else
	{
		// "Loop back"
		const distY = b.y - a.y;
		let deltaY1, deltaY2;
		if (nodeA && nodeB)
		{
			// Find Y coordinate exactly between nodes (rather than sockets)
			const midPoint = Math.floor((nodeA.centerY + nodeB.centerY) / 2);
			deltaY1 = Math.floor((midPoint - a.y) / 2);
			deltaY2 = Math.floor((b.y - midPoint) / 2);
		}
		else
		{
			deltaY1 = deltaY2 = Math.round(distY / 4);
		}

		const deltaX1 = Math.abs(deltaY1);
		const deltaX2 = Math.abs(deltaY2);

		return `M${a.x},${a.y} q ${deltaX1},0 ${deltaX1},${deltaY1} t ${-deltaX1},${deltaY1} h ${distX} q ${-deltaX2},0 ${-deltaX2},${deltaY2} T ${b.x},${b.y}`;
	}
}

function createPath(svg)
{
	const result = document.createElementNS(svg.ns, "path");
	result.setAttributeNS(null, "stroke", "#ffffff");
	result.setAttributeNS(null, "stroke-width", "2");
	result.setAttributeNS(null, "fill", "none");
	svg.appendChild(result);
	return result;
}

function appendArray(dest, source, unique)
{
	for (let i = 0; i < source.length; i++)
	{
		const item = source[i];
		if (!unique || dest.indexOf(item) < 0)
		{
			dest.push(item);
		}
	}
}

class NodeSocket
{
	constructor(editor, node, name, type)
	{
		this._id = editor._getUniqueSocketId();
		this.editor = editor;
		this.node = node;
		this.name = name;
		this.type = type;

		this.element = document.createElement("li");
		this.element.title = name;
		//this.element.innerHTML = name;
		this.element.classList.add(type);
		this.element.classList.add("empty");

		this.element.addEventListener("click", this.clickListener.bind(this));
	}

	get empty()
	{
		return this.type === INPUT ? !this.output : this.inputs.length === 0;
	}

	get connectPoint()
	{
		const offset = getOffset(this.element, this.editor.element);
		return {
			x: offset.left + this.element.offsetWidth / 2,
			y: offset.top + this.element.offsetHeight / 2 + 2 // TODO: What is 2 for? The element is measured as 14 pixels, which includes border, yet 7 won't center the point
		};
	}

	tags(tags)
	{
		this.tags = tags;
		return this;
	}

	acceptsConnection(handler)
	{
		this.acceptsConnectionHandler = handler;
		return this;
	}

	clickListener()
	{
		this.editor.socketClicked(this);
	}

	onConnectionChanged()
	{
		this.element.classList.toggle("empty", this.empty);
		this.node.onConnectionChanged(this);

		// Update input to reflect new output's value
		if (this.type === INPUT)
		{
			this.onValueChanged(this.output ? this.output.value : null);
		}
	}

	findWiringTargetCandidates(nodes)
	{
		const targets = [];
		nodes.forEach(node => {
			appendArray(targets, this.type === INPUT ? node.outputs : node.inputs);
		});

		// Cyclic dependency check:
		// TODO: Optimize this
		if (this.type === INPUT)
		{
			return targets.filter(target => {
				if (target.node === this.node)
				{
					return false;
				}
				if (target.acceptsConnectionHandler)
				{
					if (!target.acceptsConnectionHandler(target, this))
					{
						return false;
					}
				}
				return !target.node.isDependentOn(this.node);
			});
		}
		else
		{
			const dependencies = this.node.findDependencies();
			return targets.filter(target => {
				if (target.node === this.node)
				{
					return false;
				}
				if (target.acceptsConnectionHandler)
				{
					if (!target.acceptsConnectionHandler(target, this))
					{
						return false;
					}
				}
				return dependencies.indexOf(target.node) < 0;
			});
		}
	}

	select()
	{
		this.element.classList.add("selected");
	}

	deselect()
	{
		this.element.classList.remove("selected");
	}
}

class NodeOutput extends NodeSocket
{
	constructor(editor, node, name)
	{
		super(editor, node, name, OUTPUT);
		this.inputs = [];
		this._value = null;
	}

	get value()
	{
		return this._value;
	}

	set value(val)
	{
		if (val !== this._value)
		{
			this._value = val;
			this.onValueChanged(val);
		}
	}

	onValueChanged(val)
	{
		this.inputs.forEach(input => {
			input.onValueChanged(val);
		});
	}

	connect(input)
	{
		if (input.type === OUTPUT)
		{
			throw new NodeEditorError("Not connecting: Cannot connect two outputs");
		}
		// Input socket always takes care of connection
		input.connect(this);
	}

	disconnect(input)
	{
		// Input socket always takes care of connection
		input.disconnect(this);
	}

	disconnectAll()
	{
		// Need reverse loop, since this will mutate the this.inputs array:
		for (let i = this.inputs.length - 1; i >= 0; i--)
		{
			this.disconnect(this.inputs[i]);
		}
	}

	redrawPaths()
	{
		this.inputs.forEach(input => {
			input.redrawPath();
		});
	}
}

class NodeInput extends NodeSocket
{
	constructor(editor, node, name)
	{
		super(editor, node, name, INPUT);
		this.output = null;
		this.path = createPath(editor.svg);
	}

	get value()
	{
		return this.output ? this.output.value : null;
	}

	onValueChanged(val)
	{
		this.node.onInputValueChanged(this, val);
	}

	redrawPath()
	{
		if (!this.output)
		{
			this.path.removeAttribute("d");
			return;
		}
		const inPoint = this.connectPoint;
		const outPoint = this.output.connectPoint;
		const pathStr = createPathStr(outPoint, inPoint, this.node, this.output.node);
		this.path.setAttributeNS(null, "d", pathStr);
	}

	connect(output)
	{
		if (output.type === INPUT)
		{
			throw new NodeEditorError("Not connecting: Cannot connect two inputs");
		}

		if (this.acceptsConnectionHandler && !this.acceptsConnectionHandler(this, output))
		{
			throw new NodeEditorError("Not connecting: Connection not accepted by sockets");
		}

		// Check for circular dependency
		//const dependencies = output.node.findDependencies();
		if (output.node === this.node || output.node.isDependentOn(this.node))
		//if (dependencies.indexOf(this.node) >= 0)
		{
			throw new NodeEditorError("Not connecting: Circular dependency detected");
		}

		// An input can only be connected to a single output:
		this.disconnect();

		// Add to output's inputs:
		output.inputs.push(this);
		this.output = output;

		output.onConnectionChanged();
		this.onConnectionChanged();

		this.redrawPath();
	}

	disconnect()
	{
		if (this.output)
		{
			const output = this.output;
			output.inputs.splice(output.inputs.indexOf(this), 1);

			this.output = null;
			output.onConnectionChanged();
		}
		
		this.onConnectionChanged();
		this.redrawPath();
	}
}

const CLICK_TOLERANCE = 3;

class Node
{
	constructor(editor, name)
	{
		this.editor = editor;
		this.name = name;
		this._value = null;
		this.element = document.createElement("div");
		this.element.classList.add("node");

		this.eleHeader = document.createElement("h2");
		this.element.appendChild(this.eleHeader);

		this.eleInputs = document.createElement("ul");
		this.eleInputs.classList.add("inputs");
		this.element.appendChild(this.eleInputs);

		this.eleOutputs = document.createElement("ul");
		this.eleOutputs.classList.add("outputs");
		this.element.appendChild(this.eleOutputs);

		this.contentElement = document.createElement("div");
		this.contentElement.classList.add("content");
		this.element.appendChild(this.contentElement);

		this.eleRemove = document.createElement("a");
		this.eleRemove.href = "#";
		this.eleRemove.classList.add("close");
		this.eleRemove.addEventListener("click", this.removeClickListener.bind(this));
		this.element.appendChild(this.eleRemove);

		this.inputs = [];
		this.outputs = [];

		this.inputValueChanged = new Signal();
		this.inputChanged = new Signal();
		this.outputChanged = new Signal();
		this.valueChanged = new Signal();
		this.removed = new Signal();

		this.element.addEventListener("mousedown", this.mouseDownListener.bind(this));

		this.dragMoveListener = this.mouseMoveListener.bind(this);
		this.dragUpListener = this.mouseUpListener.bind(this);

		this.update();
	}

	get title()
	{
		return this._title || "";
	}

	set title(value)
	{
		this._title = value;
		this.update();
	}

	get value()
	{
		return this._value;
	}

	set value(val)
	{
		if (val !== this._value)
		{
			this._value = val;
			this.valueChanged.dispatch(val);
		}
	}

	get error()
	{
		return this.element.classList.contains("error");
	}

	set error(val)
	{
		this.element.classList.toggle("error", val);
	}

	get centerY()
	{
		return this.element.offsetTop + Math.floor(this.element.offsetHeight / 2);
	}

	addInput(name)
	{
		const input = new NodeInput(this.editor, this, name);
		this.inputs.push(input);
		this.eleInputs.appendChild(input.element);
		return input;
	}

	addOutput(name)
	{
		const output = new NodeOutput(this.editor, this, name);
		this.outputs.push(output);
		this.eleOutputs.appendChild(output.element);
		return output;
	}

	onPositionChanged()
	{
		this.inputs.forEach(input => {
			input.redrawPath();
		});

		this.outputs.forEach(output => {
			output.redrawPaths();
		});
	}

	onInputValueChanged(input, val)
	{
		this.inputValueChanged.dispatch(input, val);
	}

	onConnectionChanged(socket)
	{
		if (socket.type === INPUT)
		{
			this.inputChanged.dispatch(socket);
		}
		else
		{
			this.outputChanged.dispatch(socket);
		}
	}

	moveTo(x, y)
	{
		this.element.style.top = y + "px";
		this.element.style.left = x + "px";
		this.onPositionChanged();
	}

	getParentNodes()
	{
		const result = [];
		for (let i = 0; i < this.inputs.length; i++)
		{
			const output = this.inputs[i].output;
			if (output && result.indexOf(output.node) < 0)
			{
				result.push(output.node);
			}
		}
		return result;
	}

	isDependentOn(dependencyNode)
	{
		const nodes = [this];
		while (nodes.length > 0)
		{
			const node = nodes.shift();
			const parentNodes = node.getParentNodes();
			if (parentNodes.indexOf(dependencyNode) >= 0)
			{
				return true;
			}
			appendArray(nodes, parentNodes, true);
		}
		return false;
	}

	findDependencies()
	{
		const result = [];
		const nodes = [this];
		while (nodes.length > 0)
		{
			const node = nodes.shift();
			const parentNodes = node.getParentNodes();
			appendArray(result, parentNodes, true);
			appendArray(nodes, parentNodes, true);
		}
		return result;
	}

	mouseDownListener(e)
	{
		e.preventDefault(); // Avoids some mouse flicker
		this.dragOriginX = this.element.offsetLeft;
		this.dragOriginY = this.element.offsetTop;
		this.dragOriginMouseX = e.clientX;
		this.dragOriginMouseY = e.clientY;

		document.addEventListener("mousemove", this.dragMoveListener);
		document.addEventListener("mouseup", this.dragUpListener);
	}

	mouseMoveListener(e)
	{
		const dX = e.clientX - this.dragOriginMouseX;
		const dY = e.clientY - this.dragOriginMouseY;
		if (!this.dragging)
		{
			const delta = Math.max(Math.abs(dX), Math.abs(dY));
			if (delta > CLICK_TOLERANCE)
			{
				this.dragging = true;
				this.element.parentNode.appendChild(this.element);
			}
		}
		if (this.dragging)
		{
			// TODO: Should animation for all paths be consolidated into a single animation frame request?
			if (this.requestedFrame)
			{
				window.cancelAnimationFrame(this.requestedFrame);
				this.requestedFrame = null;
			}
			this.requestedFrame = window.requestAnimationFrame(() => {
				this.element.style.left = this.dragOriginX + dX + "px";
				this.element.style.top = this.dragOriginY + dY + "px";
				this.onPositionChanged();
			});
		}
	}

	mouseUpListener(e)
	{
		// Don't select node if we:
		// - were dragging
		// - clicked an input socket
		// - clicked an output socket
		if (!this.dragging && !this.eleInputs.contains(e.target) && !this.eleOutputs.contains(e.target))
		{
			this.editor.selectNode(this);
		}
		this.dragging = false;
		document.removeEventListener("mousemove", this.dragMoveListener);
		document.removeEventListener("mouseup", this.dragUpListener);
	}

	disconnect()
	{
		this.inputs.forEach(input => {
			input.disconnect();
		});
		this.outputs.forEach(output => {
			output.disconnectAll();
		});
	}

	remove()
	{
		this.disconnect();
		this.editor._removeNode(this);
		this.removed.dispatch(this);
	}

	removeClickListener(e)
	{
		e.preventDefault();
		this.remove();
	}

	update()
	{
		this.eleHeader.innerText = this._title || this.name;
	}

	save()
	{
		const result = {
			name: this.name,
			title: this.title,
			x: this.element.offsetLeft,
			y: this.element.offsetTop,
			inputs: this.inputs.map(input => input.output ? input.output._id : null),
			outputs: this.outputs.map(output => output._id)
		};

		if (this.controller)
		{
			result.controller = this.controller.save();
		}

		return result;
	}
}

class NodeEditor
{
	get absoluteOffset()
	{
		let x = 0, y = 0, element = this.element;
		while (element)
		{
			x += element.offsetLeft;
			y += element.offsetTop;
			element = element.offsetParent;
		}
		return {x, y};
	}

	constructor(element)
	{
		// Unique ID for each socket in the editor (used for saving connections)
		// Incremented whenever a socket requests its ID.
		this._socketId = 1;

		this.element = element;

		const svg = this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		element.appendChild(svg);
		svg.ns = svg.namespaceURI;
		this.wiringPath = createPath(svg);

		this.nodes = [];

		this.wiringFromSocket = null;
		this.selectedNode = null;

		this.selectedNodeChanged = new Signal();

		this._panningPosition = { x: 0, y: 0 };

		this._boundWiringMoveListener = this.wiringMouseMoveListener.bind(this);
		this._boundWiringClickListener = this.wiringClickListener.bind(this);
		this._boundPanningMouseUpListener = this.panningMouseUpListener.bind(this);
		this._boundPanningMouseMoveListener = this.panningMouseMoveListener.bind(this);
		this.element.addEventListener("click", this.editorClickListener.bind(this));
		this.element.addEventListener("mousedown", this.panningMouseDownListener.bind(this));
	}

	addNode(name)
	{
		const node = new Node(this, name);
		this.nodes.push(node);
		this.element.appendChild(node.element);

		return node;
	}

	removeNode(node)
	{
		node.remove();
	}

	clear()
	{
		for (let i = this.nodes.length - 1; i >= 0; i--)
		{
			this.nodes[i].remove();
		}
	}

	_removeNode(node)
	{
		this.nodes.splice(this.nodes.indexOf(node), 1);
		this.element.removeChild(node.element);
	}

	_getUniqueSocketId()
	{
		return this._socketId++;
	}

	socketClicked(socket)
	{
		if (this.wiringFromSocket)
		{
			this.endWiring(socket);
		}
		else
		{
			this.startWiring(socket);
		}
	}

	markSockets(className, condition)
	{
		const sockets = [];
		this.nodes.forEach(node => {
			appendArray(sockets, node.inputs);
			appendArray(sockets, node.outputs);
		});
		sockets.forEach(socket => {
			socket.element.classList.toggle(className, condition(socket));
		});
	}

	clearSockets(className)
	{
		const sockets = [];
		this.nodes.forEach(node => {
			appendArray(sockets, node.inputs);
			appendArray(sockets, node.outputs);
		});
		sockets.forEach(socket => {
			socket.element.classList.remove(className);
		});
	}

	startWiring(socket)
	{
		if (this.wiringFromSocket)
		{
			this.stopWiring();
		}

		this.element.classList.add("wiring");

		this.wiringFromSocket = socket;
		this.wiringFromPoint = socket.connectPoint;

		const candidates = socket.findWiringTargetCandidates(this.nodes);
		this.markSockets("target", s => candidates.indexOf(s) >= 0);

		socket.select();

		document.addEventListener("mousemove", this._boundWiringMoveListener);
		document.addEventListener("click", this._boundWiringClickListener);
	}

	endWiring(socket2)
	{
		if (!this.wiringFromSocket)
		{
			return;
		}

		this.clearSockets("target");

		const socket1 = this.wiringFromSocket;
		this.stopWiring();

		socket1.connect(socket2);
	}

	stopWiring()
	{
		if (this.wiringFromSocket)
		{
			document.removeEventListener("mousemove", this._boundWiringMoveListener);
			document.removeEventListener("click", this._boundWiringClickListener);

			this.element.classList.remove("wiring");

			this.wiringPath.removeAttribute("d");
			this.wiringFromSocket.deselect();
			this.wiringFromSocket = null;
		}
	}

	wiringClickListener(e)
	{
		if (this.wiringFromSocket)
		{
			if (e.target === this.wiringFromSocket.element)
			{
				return;
			}
			this.stopWiring();
		}
	}

	wiringMouseMoveListener(e)
	{
		if (this.wiringFromSocket)
		{
			const path = this.wiringPath;
			const connectPoint = this.wiringFromPoint;
			const offset = this.absoluteOffset;
			const point = { x: e.clientX - offset.x, y: e.clientY - offset.y };
			// Input socket point should be second argument always
			const pathStr = this.wiringFromSocket.type === INPUT ? createPathStr(point, connectPoint) : createPathStr(connectPoint, point);
			path.setAttributeNS(null, "d", pathStr);
		}
	}

	editorClickListener(e)
	{
		if (e.target !== this.element)
		{
			// Only deselect node when clicking the actual editor surface
			return;
		}
		this.selectNode(null);
	}

	panningMouseDownListener(e)
	{
		if (e.target !== this.element)
		{
			// Only pan when clicking the actual editor surface
			return;
		}

		this.startPanning(e.clientX, e.clientY);
	}

	panningMouseUpListener(e)
	{
		this.endPanning(e.clientX, e.clientY);
	}

	panningMouseMoveListener(e)
	{
		this.pan(e.clientX, e.clientY);
	}

	startPanning(originX, originY)
	{
		this.element.classList.add("panning");
		this._panningOrigin = { x: originX, y: originY };

		document.addEventListener("mouseup", this._boundPanningMouseUpListener);
		document.addEventListener("mousemove", this._boundPanningMouseMoveListener);
	}

	endPanning(x, y)
	{
		this.element.classList.remove("panning");
		document.removeEventListener("mouseup", this._boundPanningMouseUpListener);
		document.removeEventListener("mousemove", this._boundPanningMouseMoveListener);

		const deltaX = x - this._panningOrigin.x;
		const deltaY = y - this._panningOrigin.y;
		this._panningPosition.x += deltaX;
		this._panningPosition.y += deltaY;
	}

	pan(x, y)
	{
		if (this._requestedPanningFrame)
		{
			window.cancelAnimationFrame(this._requestedPanningFrame);
			this._requestedPanningFrame = null;
		}
		else
		{
			this._requestedPanningFrame = window.requestAnimationFrame(() =>
			{
				const deltaX = x - this._panningOrigin.x;
				const deltaY = y - this._panningOrigin.y;
				const panX = this._panningPosition.x + deltaX;
				const panY = this._panningPosition.y + deltaY;
				this.element.style.left = panX + "px";
				this.element.style.top = panY + "px";
				//this.element.style.transform = `translate(${panX}px,${panY}px)`;
			});
		}
	}

	selectNode(node)
	{
		if (this.selectedNode)
		{
			this.selectedNode.element.classList.remove("selected");
		}
		this.selectedNode = node;
		if (node)
		{
			node.element.classList.add("selected");
		}

		this.selectedNodeChanged.dispatch(node);
	}

	load(data, nodeCreator)
	{
		this.clear();

		const outputs = {};

		// Collect outputs and index by ID:
		for (const nodeData of data.nodes)
		{
			const node = nodeCreator(nodeData.controller, nodeData.title || nodeData.name, nodeData.x, nodeData.y);
			nodeData.node = node;
			for (let outputIndex = 0; outputIndex < node.outputs.length; outputIndex++)
			{
				const outputId = nodeData.outputs[outputIndex];
				outputs[outputId] = node.outputs[outputIndex];
			}
		}

		// Reconnect inputs to outputs:
		for (const nodeData of data.nodes)
		{
			const node = nodeData.node;
			for (let inputIndex = 0; inputIndex < node.inputs.length; inputIndex++)
			{
				const input = node.inputs[inputIndex];
				const outputId = nodeData.inputs[inputIndex];
				if (outputId !== null)
				{
					input.connect(outputs[outputId]);
				}
			}
		}
	}

	save()
	{
		const result = {};
		result.nodes = this.nodes.map(node => node.save());

		return result;
	}
}

export {
	Node,
	NodeEditor
};